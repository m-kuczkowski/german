import { chmodSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { neon } from "@neondatabase/serverless";

function loadEnv(name) {
  const envFile = process.env.WORTSCHATZ_ENV_FILE || ".env.local";
  const line = readFileSync(resolve(envFile), "utf8")
    .split(/\r?\n/)
    .find((item) => item.startsWith(`${name}=`));
  return line ? line.slice(name.length + 1).replace(/^"|"$/g, "") : undefined;
}

const output = process.argv[2];
if (!output || !output.startsWith("/private/tmp/")) {
  throw new Error("Podaj bezpieczną ścieżkę kopii w /private/tmp.");
}

const databaseUrl =
  process.env.DATABASE_URL_UNPOOLED ||
  loadEnv("DATABASE_URL_UNPOOLED") ||
  process.env.DATABASE_URL ||
  loadEnv("DATABASE_URL");
if (!databaseUrl) throw new Error("Brakuje DATABASE_URL w pliku środowiskowym.");

const sql = neon(databaseUrl);
const [cards, profiles, progress] = await Promise.all([
  sql.query("SELECT id, position, content FROM catalog_cards ORDER BY id"),
  sql.query(`
    SELECT id, token_hash, meta, created_at, updated_at, display_name, name_key
    FROM learning_profiles ORDER BY id
  `),
  sql.query(`
    SELECT profile_id, card_id, data, updated_at
    FROM card_progress ORDER BY profile_id, card_id
  `),
]);

writeFileSync(output, JSON.stringify({
  version: 1,
  exportedAt: new Date().toISOString(),
  cards,
  profiles,
  progress,
}));
chmodSync(output, 0o600);
console.log(JSON.stringify({
  output,
  cards: cards.length,
  profiles: profiles.length,
  progress: progress.length,
}));
