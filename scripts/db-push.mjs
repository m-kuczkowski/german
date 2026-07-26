import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { neon } from "@neondatabase/serverless";

function loadEnv(name) {
  const line = readFileSync(resolve(".env.local"), "utf8")
    .split(/\r?\n/)
    .find((item) => item.startsWith(`${name}=`));
  return line ? line.slice(name.length + 1).replace(/^"|"$/g, "") : undefined;
}

const databaseUrl = process.env.DATABASE_URL_UNPOOLED || loadEnv("DATABASE_URL_UNPOOLED") || process.env.DATABASE_URL || loadEnv("DATABASE_URL");
if (!databaseUrl) throw new Error("Brakuje DATABASE_URL_UNPOOLED w .env.local.");

const generated = readFileSync(resolve("src/data/nicosWegCards.ts"), "utf8");
const match = generated.match(/JSON\.parse\((.*)\) as CardContent\[\];/);
if (!match) throw new Error("Nie udało się odczytać wygenerowanych kart.");
const cards = JSON.parse(JSON.parse(match[1]));
const sql = neon(databaseUrl);

await sql`CREATE TABLE IF NOT EXISTS catalog_cards (
  id TEXT PRIMARY KEY,
  position INTEGER NOT NULL UNIQUE,
  content JSONB NOT NULL
)`;
await sql`CREATE TABLE IF NOT EXISTS learning_profiles (
  id UUID PRIMARY KEY,
  token_hash TEXT NOT NULL,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`;
await sql`CREATE TABLE IF NOT EXISTS card_progress (
  profile_id UUID NOT NULL REFERENCES learning_profiles(id) ON DELETE CASCADE,
  card_id TEXT NOT NULL REFERENCES catalog_cards(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (profile_id, card_id)
)`;

const payload = cards.map((content, position) => ({ ...content, position }));
await sql.query(
  `INSERT INTO catalog_cards (id, position, content)
   SELECT entry->>'id', (entry->>'position')::integer, entry - 'position'
   FROM jsonb_array_elements($1::jsonb) AS entry
   ON CONFLICT (id) DO UPDATE SET position = EXCLUDED.position, content = EXCLUDED.content`,
  [JSON.stringify(payload)],
);

console.log(JSON.stringify({ cards: cards.length, status: "catalog-synchronized" }));
