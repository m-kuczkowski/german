import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

function readCatalog(scope) {
  const catalogPath = scope === "nicos"
    ? "src/data/nicosWegCards.ts"
    : "src/data/goetheCards.ts";
  const generated = readFileSync(resolve(catalogPath), "utf8");
  const match = generated.match(/JSON\.parse\((.*)\) as CardContent\[\];/);
  if (!match) throw new Error("Nie udało się odczytać wygenerowanych kart.");
  const cards = JSON.parse(JSON.parse(match[1]));
  return scope === "core"
    ? cards.filter((card) => (card.curriculumTier ?? "core") === "core")
    : cards;
}

export function spokenGerman(card) {
  const spoken = [card.article, card.german]
    .filter(Boolean)
    .join(" ")
    .replace(/\|/g, "")
    .replace(/\s*\/\s*/g, " oder ")
    .replace(/[()]/g, " ")
    .replace(/[·•]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return spoken === "zuhören jemandem" ? "jemandem zuhören" : spoken;
}

function main() {
  const args = process.argv.slice(2);
  const outputIndex = args.indexOf("--output");
  const limitIndex = args.indexOf("--limit");
  const onlyIndex = args.indexOf("--only");
  const scopeIndex = args.indexOf("--scope");
  const scope = scopeIndex >= 0 ? args[scopeIndex + 1] : "all";
  if (!["all", "core", "nicos"].includes(scope)) {
    throw new Error("--scope musi mieć wartość: all, core albo nicos.");
  }
  const output =
    outputIndex >= 0 ? resolve(args[outputIndex + 1]) : resolve("data/piper-audio-source.json");
  const limit = limitIndex >= 0 ? Number.parseInt(args[limitIndex + 1], 10) : undefined;
  const selectedIds =
    onlyIndex >= 0 ? new Set(args[onlyIndex + 1].split(",").filter(Boolean)) : null;

  let cards = readCatalog(scope);
  if (selectedIds) cards = cards.filter((card) => selectedIds.has(card.id));
  if (Number.isFinite(limit)) cards = cards.slice(0, limit);

  const source = cards.map((card) => ({
    id: card.id,
    text: spokenGerman(card),
  }));

  writeFileSync(output, `${JSON.stringify(source, null, 2)}\n`);
  console.log(JSON.stringify({ output, scope, cards: source.length }));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
