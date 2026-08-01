import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { neon } from "@neondatabase/serverless";
import { grammarTopicSeed } from "../api/grammar-seed.js";
import {
  MIGRATION_ID,
  migrationStatements,
  validationPassed,
  validationQuery,
} from "./db-schema-grammar.mjs";

function loadEnv(name) {
  const envFile = process.env.WORTSCHATZ_ENV_FILE || ".env.local";
  const line = readFileSync(resolve(envFile), "utf8")
    .split(/\r?\n/)
    .find((item) => item.startsWith(`${name}=`));
  return line ? line.slice(name.length + 1).replace(/^"|"$/g, "") : undefined;
}

function database() {
  const url = process.env.DATABASE_URL_UNPOOLED || loadEnv("DATABASE_URL_UNPOOLED") || process.env.DATABASE_URL || loadEnv("DATABASE_URL");
  if (!url) throw new Error("Brakuje DATABASE_URL w pliku środowiskowym.");
  return neon(url);
}

function seedTopics(sql) {
  return sql.query(
    `WITH topics AS (
       SELECT * FROM jsonb_to_recordset($1::jsonb)
       AS topic(id text, level text, "sortOrder" integer, "titlePl" text, "titleDe" text, published boolean)
     )
     INSERT INTO grammar_topics (id, level, sort_order, title_pl, title_de, published)
     SELECT id, level, "sortOrder", "titlePl", "titleDe", published FROM topics
     ON CONFLICT (id) DO UPDATE SET
       level = EXCLUDED.level,
       sort_order = EXCLUDED.sort_order,
       title_pl = EXCLUDED.title_pl,
       title_de = EXCLUDED.title_de,
       published = EXCLUDED.published,
       updated_at = NOW()`,
    [JSON.stringify(grammarTopicSeed)],
  );
}

async function snapshot(sql) {
  return (await sql.query(`
    SELECT
      (SELECT COUNT(*) FROM catalog_cards) AS cards,
      (SELECT COUNT(*) FROM learning_profiles) AS profiles,
      (SELECT COUNT(*) FROM card_progress) AS progress_rows,
      (SELECT COUNT(*) FROM card_review_history) AS review_events
  `))[0];
}

async function apply(sql) {
  const before = await snapshot(sql);
  await sql.transaction((txn) => [
    ...migrationStatements.map((statement) => txn.query(statement)),
    seedTopics(txn),
  ]);
  const after = await snapshot(sql);
  for (const key of ["cards", "profiles", "progress_rows", "review_events"]) {
    if (Number(before[key]) !== Number(after[key])) throw new Error(`Migracja nie może zmienić liczby: ${key}.`);
  }
  const validation = (await sql.query(validationQuery))[0];
  if (!validationPassed(validation)) throw new Error(`Walidacja migracji gramatyki nie powiodła się: ${JSON.stringify(validation)}`);
  await sql.query(
    `INSERT INTO schema_migrations (id, validation) VALUES ($1, $2::jsonb)
     ON CONFLICT (id) DO UPDATE SET validation = EXCLUDED.validation`,
    [MIGRATION_ID, JSON.stringify(validation)],
  );
  return { migration: MIGRATION_ID, mode: "production", validation };
}

async function validate(sql) {
  const validation = (await sql.query(validationQuery))[0];
  if (!validationPassed(validation)) throw new Error(`Walidacja gramatyki nie powiodła się: ${JSON.stringify(validation)}`);
  return { migration: MIGRATION_ID, mode: "validate", validation };
}

const mode = process.argv[2] || "--validate";
const sql = database();
const result = mode === "--apply" ? await apply(sql) : mode === "--validate" ? await validate(sql) : null;
if (!result) throw new Error("Użycie: db-migrate-grammar.mjs --apply|--validate");
console.log(JSON.stringify(result, null, 2));
