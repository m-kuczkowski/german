#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [a2Deck, b1Deck, outputPath] = process.argv.slice(2);

if (!a2Deck || !b1Deck || !outputPath) {
  console.error("Usage: node scripts/extract-anki-decks.mjs A2.apkg B1.apkg output.json");
  process.exit(1);
}

function readDeck(deckPath, metadata) {
  const directory = mkdtempSync(join(tmpdir(), "nicos-weg-"));
  const databasePath = join(directory, "collection.anki21");
  const database = execFileSync("unzip", ["-p", deckPath, "collection.anki21"], {
    maxBuffer: 8 * 1024 * 1024,
  });
  writeFileSync(databasePath, database);
  const rows = JSON.parse(
    execFileSync("sqlite3", ["-json", databasePath, "select id, flds from notes order by id"], {
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
    }),
  );

  return rows.map(({ id, flds }) => {
    const fields = flds.split("\u001f");
    return {
      id: `${metadata.deckId}:${id}`,
      deckId: metadata.deckId,
      level: metadata.level,
      german: fields[0]?.trim() || "",
      sourceGloss: fields[1]?.trim() || "",
      sourceLanguage: metadata.sourceLanguage,
      lesson: fields[4]?.trim() || "",
      lessonUrl: fields[5]?.trim() || "",
      sourceUrl: metadata.sourceUrl,
    };
  });
}

const cards = [
  ...readDeck(a2Deck, {
    deckId: "458469586",
    level: "A2",
    sourceLanguage: "en",
    sourceUrl: "https://ankiweb.net/shared/info/458469586",
  }),
  ...readDeck(b1Deck, {
    deckId: "492301569",
    level: "B1",
    sourceLanguage: "de",
    sourceUrl: "https://ankiweb.net/shared/info/492301569",
  }),
];

writeFileSync(
  outputPath,
  `${JSON.stringify(
    {
      schemaVersion: 1,
      instructions:
        "Translate sourceGloss into concise, natural Polish for a Polish-speaking German learner. Preserve every id and all other fields exactly.",
      cards,
    },
    null,
    2,
  )}\n`,
);

console.log(`Extracted ${cards.length} cards to ${outputPath}`);
