#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { LESSON_CATEGORIES } from "./life-categories.mjs";
import { curriculumTierFor } from "./curriculum-tiers.mjs";

const [sourcePath, translationsPath, outputPath = "src/data/nicosWegCards.ts"] =
  process.argv.slice(2);

if (!sourcePath || !translationsPath) {
  console.error(
    "Usage: node scripts/build-static-cards.mjs source.json translations.json [output.ts]",
  );
  process.exit(1);
}

const source = JSON.parse(readFileSync(resolve(sourcePath), "utf8"));
const translated = JSON.parse(readFileSync(resolve(translationsPath), "utf8"));
const translations = Array.isArray(translated) ? translated : translated.translations;

if (!Array.isArray(source.cards) || !Array.isArray(translations)) {
  throw new Error("Nieprawidłowy format pliku źródłowego lub tłumaczeń.");
}

const sourceIds = new Set(source.cards.map((card) => card.id));
const translatedIds = new Set(translations.map((entry) => entry.id));
const missing = [...sourceIds].filter((id) => !translatedIds.has(id));
const extra = [...translatedIds].filter((id) => !sourceIds.has(id));
const duplicateCount = translations.length - translatedIds.size;

if (
  source.cards.length !== 3038 ||
  sourceIds.size !== 3038 ||
  translations.length !== 3038 ||
  translatedIds.size !== 3038 ||
  missing.length ||
  extra.length ||
  duplicateCount
) {
  throw new Error(
    JSON.stringify(
      {
        sourceCards: source.cards.length,
        sourceIds: sourceIds.size,
        translations: translations.length,
        translatedIds: translatedIds.size,
        duplicateCount,
        missing: missing.slice(0, 20),
        extra: extra.slice(0, 20),
      },
      null,
      2,
    ),
  );
}

const translationById = new Map(
  translations.map((entry) => {
    if (
      typeof entry.id !== "string" ||
      typeof entry.polish !== "string" ||
      entry.polish.trim().length < 1 ||
      entry.polish.length > 600 ||
      typeof entry.exampleGerman !== "string" ||
      entry.exampleGerman.trim().length < 4 ||
      entry.exampleGerman.length > 600 ||
      typeof entry.examplePolish !== "string" ||
      entry.examplePolish.trim().length < 4 ||
      entry.examplePolish.length > 600
    ) {
      throw new Error(`Nieprawidłowe tłumaczenie dla ${entry.id || "brak id"}.`);
    }
    return [
      entry.id,
      {
        polish: entry.polish.trim(),
        exampleGerman: entry.exampleGerman.trim(),
        examplePolish: entry.examplePolish.trim(),
      },
    ];
  }),
);

function stripHtml(value) {
  return value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function parseGerman(rawValue) {
  let value = stripHtml(rawValue);
  let article = null;
  let plural = null;

  const articleMatch = value.match(/^(der|die|das)\s+/i);
  if (articleMatch) {
    article = articleMatch[1].toLowerCase();
    value = value.slice(articleMatch[0].length).trim();
  }

  const genderMatch = value.match(/\((m|f|n)\.[^)]*\)\s*$/i);
  if (genderMatch) {
    article = { m: "der", f: "die", n: "das" }[genderMatch[1].toLowerCase()];
    value = value.slice(0, genderMatch.index).trim();
  } else {
    value = value
      .replace(/\s*\([^)]*(?:nur Singular|nur Plural|Plural)[^)]*\)\s*$/i, "")
      .trim();
  }

  if (article && value.includes(",")) {
    const [singular, ...rest] = value.split(",");
    value = singular.trim();
    plural =
      rest
        .join(",")
        .trim()
        .replace(/^(die|der|das)\s+/i, "") || null;
  }

  return { german: value || stripHtml(rawValue), article, plural };
}

function quoted(value) {
  return JSON.stringify(value);
}

const cards = [];

for (const sourceCard of source.cards) {
  const parsed = parseGerman(sourceCard.german);
  const translation = translationById.get(sourceCard.id);
  const category = LESSON_CATEGORIES[sourceCard.lesson];
  if (!category) {
    throw new Error(`Brak kategorii życiowej dla lekcji: ${sourceCard.lesson}`);
  }
  const [deckId, noteId] = sourceCard.id.split(":");
  const legacyHash = createHash("sha1").update(`${deckId}:${noteId}`).digest("hex").slice(0, 12);
  cards.push({
    id: `nicos-${sourceCard.level.toLowerCase()}-${legacyHash}`,
    german: parsed.german,
    polish: translation.polish,
    article: parsed.article,
    plural: parsed.plural,
    exampleGerman: translation.exampleGerman,
    examplePolish: translation.examplePolish,
    category,
    curriculumTier: curriculumTierFor({
      german: parsed.german,
      lesson: sourceCard.lesson,
      level: sourceCard.level,
    }),
    level: sourceCard.level,
    sourceLabel: `Nicos Weg ${sourceCard.level} · Deutsche Welle`,
    sourceUrl: sourceCard.sourceUrl,
    sourceGloss: stripHtml(sourceCard.sourceGloss),
    sourceLanguage: sourceCard.sourceLanguage,
  });
}

const lines = [
  'import type { CardContent } from "../types";',
  "",
  "// Generated from all 3038 notes in the two public AnkiWeb decks.",
  "// Polish translations were created in a separate AI translation pass.",
  `export const nicosWegContents: CardContent[] = JSON.parse(${quoted(JSON.stringify(cards))}) as CardContent[];`,
  "",
  "export const nicosWegCategories = [",
  "  ...new Set(nicosWegContents.map((card) => card.category)),",
  "];",
  "",
];

writeFileSync(resolve(outputPath), lines.join("\n"));

const unchanged = source.cards.filter(
  (card) =>
    stripHtml(card.sourceGloss).toLocaleLowerCase("pl-PL") ===
    translationById.get(card.id).polish.toLocaleLowerCase("pl-PL"),
);

console.log(
  JSON.stringify(
    {
      cards: source.cards.length,
      a2: source.cards.filter((card) => card.level === "A2").length,
      b1: source.cards.filter((card) => card.level === "B1").length,
      uniqueIds: sourceIds.size,
      unchangedTranslations: unchanged.length,
      output: resolve(outputPath),
    },
    null,
    2,
  ),
);
