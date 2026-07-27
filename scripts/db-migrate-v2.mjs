import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { neon } from "@neondatabase/serverless";
import {
  MIGRATION_ID,
  legacySchemaStatements,
  migrationStatements,
  validationPassed,
  validationQuery,
} from "./db-schema-v2.mjs";

function loadEnv(name) {
  const envFile = process.env.WORTSCHATZ_ENV_FILE || ".env.local";
  const line = readFileSync(resolve(envFile), "utf8")
    .split(/\r?\n/)
    .find((item) => item.startsWith(`${name}=`));
  return line ? line.slice(name.length + 1).replace(/^"|"$/g, "") : undefined;
}

function database() {
  const databaseUrl =
    process.env.DATABASE_URL_UNPOOLED ||
    loadEnv("DATABASE_URL_UNPOOLED") ||
    process.env.DATABASE_URL ||
    loadEnv("DATABASE_URL");
  if (!databaseUrl) throw new Error("Brakuje DATABASE_URL w pliku środowiskowym.");
  return neon(databaseUrl);
}

function safeSchemaName(value) {
  if (!/^[a-z_][a-z0-9_]*$/.test(value)) throw new Error("Nieprawidłowa nazwa schematu testowego.");
  return value;
}

async function migrate(sql) {
  await sql.transaction((txn) => [
    ...migrationStatements.map((statement) => txn.query(statement)),
    txn.query(validationQuery),
  ]);
  const rows = await sql.query(validationQuery);
  if (!rows[0] || !validationPassed(rows[0])) {
    throw new Error(`Walidacja migracji nie powiodła się: ${JSON.stringify(rows[0] ?? {})}`);
  }
  return rows[0];
}

async function runIsolatedCopy(sql) {
  const suffix = `${Date.now()}_${process.pid}`.replace(/\D/g, "");
  const schema = safeSchemaName(`migration_test_${suffix}`);
  const quotedSchema = `"${schema}"`;

  try {
    await sql.query(`CREATE SCHEMA ${quotedSchema}`);
    await sql.transaction((txn) => [
      txn.query(`SET LOCAL search_path TO ${quotedSchema}`),
      ...legacySchemaStatements.map((statement) => txn.query(statement)),
      txn.query(`INSERT INTO catalog_cards SELECT id, position, content FROM public.catalog_cards`),
      txn.query(`INSERT INTO learning_profiles
        SELECT id, token_hash, meta, created_at, updated_at, display_name, name_key
        FROM public.learning_profiles`),
      txn.query(`INSERT INTO card_progress
        SELECT profile_id, card_id, data, updated_at FROM public.card_progress`),
    ]);

    const scopedSql = {
      query(statement, params) {
        return sql.transaction((txn) => [
          txn.query(`SET LOCAL search_path TO ${quotedSchema}`),
          txn.query(statement, params),
        ]).then((results) => results[1]);
      },
      transaction(callback) {
        return sql.transaction((txn) => {
          const scoped = {
            query: (statement, params) => txn.query(statement, params),
          };
          return [txn.query(`SET LOCAL search_path TO ${quotedSchema}`), ...callback(scoped)];
        });
      },
    };

    const first = await migrate(scopedSql);
    const second = await migrate(scopedSql);
    const publicCounts = (await sql.query(`
      SELECT
        (SELECT COUNT(*) FROM public.catalog_cards) AS cards,
        (SELECT COUNT(*) FROM public.learning_profiles) AS profiles,
        (SELECT COUNT(*) FROM public.card_progress) AS progress_rows
    `))[0];

    for (const key of ["cards", "profiles", "progress_rows"]) {
      if (Number(first[key]) !== Number(publicCounts[key]) || Number(second[key]) !== Number(publicCounts[key])) {
        throw new Error(`Niezgodna liczba ${key} w izolowanym schemacie.`);
      }
    }

    return {
      migration: MIGRATION_ID,
      mode: "isolated-copy",
      idempotent: true,
      validation: second,
    };
  } finally {
    await sql.query(`DROP SCHEMA IF EXISTS ${quotedSchema} CASCADE`);
  }
}

async function applyProduction(sql) {
  const before = (await sql.query(`
    SELECT
      (SELECT COUNT(*) FROM catalog_cards) AS cards,
      (SELECT COUNT(*) FROM learning_profiles) AS profiles,
      (SELECT COUNT(*) FROM card_progress) AS progress_rows,
      (SELECT COALESCE(SUM(jsonb_array_length(data->'reviewHistory')), 0)
        FROM card_progress) AS review_events,
      md5(COALESCE((SELECT string_agg(id || ':' || position || ':' || content::text, '|' ORDER BY id)
        FROM catalog_cards), '')) AS catalog_legacy_checksum,
      md5(COALESCE((SELECT string_agg(id || ':' || COALESCE(name_key, '') || ':' || meta::text, '|' ORDER BY id)
        FROM learning_profiles), '')) AS profiles_legacy_checksum,
      md5(COALESCE((SELECT string_agg(profile_id || ':' || card_id || ':' || data::text, '|' ORDER BY profile_id, card_id)
        FROM card_progress), '')) AS progress_legacy_checksum
  `))[0];

  const after = await migrate(sql);
  for (const key of ["cards", "profiles", "progress_rows", "review_events"]) {
    if (Number(before[key]) !== Number(after[key])) {
      throw new Error(`Licznik ${key} zmienił się podczas migracji.`);
    }
  }
  for (const key of ["catalog_legacy_checksum", "profiles_legacy_checksum", "progress_legacy_checksum"]) {
    if (before[key] !== after[key]) {
      throw new Error(`Suma kontrolna ${key} zmieniła się podczas migracji.`);
    }
  }

  await sql.query(
    `INSERT INTO schema_migrations (id, validation)
     VALUES ($1, $2::jsonb)
     ON CONFLICT (id) DO UPDATE SET validation = EXCLUDED.validation`,
    [MIGRATION_ID, JSON.stringify(after)],
  );

  return {
    migration: MIGRATION_ID,
    mode: "production",
    validation: after,
  };
}

async function validateProduction(sql) {
  const row = (await sql.query(validationQuery))[0];
  if (!row || !validationPassed(row)) {
    throw new Error(`Walidacja nie powiodła się: ${JSON.stringify(row ?? {})}`);
  }
  return { migration: MIGRATION_ID, mode: "validate", validation: row };
}

const mode = process.argv[2] || "--validate";
const sql = database();
let result;
if (mode === "--test-copy") result = await runIsolatedCopy(sql);
else if (mode === "--apply") result = await applyProduction(sql);
else if (mode === "--validate") result = await validateProduction(sql);
else throw new Error("Użycie: db-migrate-v2.mjs --test-copy|--apply|--validate");

console.log(JSON.stringify(result, null, 2));
