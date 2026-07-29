#!/usr/bin/env node

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(".");
const source = JSON.parse(
  readFileSync(resolve(root, "data/goetheOfficialSource.json"), "utf8"),
);
const generated = readFileSync(resolve(root, "src/data/nicosWegCards.ts"), "utf8");
const nicosMatch = generated.match(/JSON\.parse\((.*)\) as CardContent\[\];/);
if (!nicosMatch) throw new Error("Nie udało się odczytać kart Nicos Weg.");
const nicosCards = JSON.parse(JSON.parse(nicosMatch[1]));

const translationFiles = readdirSync(resolve(root, "data"))
  .filter((name) => /^goetheTranslations-\d{3}\.json$/.test(name))
  .sort();
const translations = translationFiles.flatMap((name) => {
  const payload = JSON.parse(readFileSync(resolve(root, "data", name), "utf8"));
  if (payload.schemaVersion !== 1 || !Array.isArray(payload.translations)) {
    throw new Error(`Nieprawidłowy format ${name}.`);
  }
  return payload.translations;
});

const allowedCategories = new Set(nicosCards.map((card) => card.category));
const expectedIds = source.missingEntries.map((entry) => entry.id);
const expectedIdSet = new Set(expectedIds);
const translationIds = translations.map((entry) => entry.id);
const translationIdSet = new Set(translationIds);

const missingIds = expectedIds.filter((id) => !translationIdSet.has(id));
const extraIds = translationIds.filter((id) => !expectedIdSet.has(id));
if (
  translations.length !== expectedIds.length ||
  translationIdSet.size !== expectedIds.length ||
  missingIds.length ||
  extraIds.length
) {
  throw new Error(JSON.stringify({
    expected: expectedIds.length,
    translated: translations.length,
    unique: translationIdSet.size,
    missing: missingIds.slice(0, 20),
    extra: extraIds.slice(0, 20),
  }, null, 2));
}

const sourceById = new Map(source.entries.map((entry, index) => [
  entry.id,
  { ...entry, curriculumOrder: index },
]));
const translationById = new Map(translations.map((translation) => {
  const requiredStrings = [
    "id",
    "german",
    "polish",
    "exampleGerman",
    "examplePolish",
    "category",
  ];
  if (
    !requiredStrings.every(
      (key) => typeof translation[key] === "string" && translation[key].trim(),
    ) ||
    ![null, "der", "die", "das"].includes(translation.article) ||
    (translation.plural !== null && typeof translation.plural !== "string") ||
    !allowedCategories.has(translation.category) ||
    /[|/]/.test(translation.german)
  ) {
    throw new Error(`Nieprawidłowe tłumaczenie Goethe dla ${translation.id}.`);
  }
  return [translation.id, translation];
}));

const matchedLevels = source.matchedCardLevels;
const officialOrderByKey = new Map();
for (const [index, entry] of source.entries.entries()) {
  for (const key of entry.matchKeys) {
    if (!officialOrderByKey.has(key)) officialOrderByKey.set(key, index);
  }
}

function normaliseKey(value) {
  return value
    .trim()
    .toLocaleLowerCase("de-DE")
    .replace(/^(der|die|das)\s+/, "")
    .replace(/^(sich|etwas|jemandem|jemanden|jemand)\s+/, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-zäöüß0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const mappedNicos = nicosCards.map((card) => {
  const goetheLevel = matchedLevels[card.id];
  if (!goetheLevel) {
    return {
      ...card,
      curriculumTier: card.curriculumTier === "specialist" ? "specialist" : "extension",
    };
  }
  const curriculumOrder = officialOrderByKey.get(normaliseKey(card.german));
  return {
    ...card,
    curriculumTier: "core",
    goetheLevel,
    goetheSourceUrl: goetheLevel === "A2"
      ? source.generatedFrom.goetheA2
      : source.generatedFrom.goetheB1,
    ...(Number.isInteger(curriculumOrder) ? { curriculumOrder } : {}),
  };
});

const mappedNicosByKey = new Map();
for (const [index, card] of mappedNicos.entries()) {
  const key = normaliseKey(card.german);
  const candidates = mappedNicosByKey.get(key) ?? [];
  candidates.push(index);
  mappedNicosByKey.set(key, candidates);
}

const missingCards = [];
const addedMissingByKey = new Map();
let promotedByTranslatedForm = 0;
let collapsedOfficialVariants = 0;
for (const id of expectedIds) {
  const translation = translationById.get(id);
  const official = sourceById.get(id);
  const translatedKey = normaliseKey(translation.german);
  const matchingNicosIndex = (mappedNicosByKey.get(translatedKey) ?? []).find(
    (index) =>
      translation.article === null ||
      mappedNicos[index].article === translation.article,
  );
  if (Number.isInteger(matchingNicosIndex)) {
    const existing = mappedNicos[matchingNicosIndex];
    mappedNicos[matchingNicosIndex] = {
      ...existing,
      curriculumTier: "core",
      curriculumOrder: Math.min(
        existing.curriculumOrder ?? Number.POSITIVE_INFINITY,
        official.curriculumOrder,
      ),
      goetheLevel:
        existing.goetheLevel === "A2" || official.goetheLevel === "A2"
          ? "A2"
          : "B1",
      goetheSourceUrl:
        existing.goetheLevel === "A2" || official.goetheLevel === "A2"
          ? source.generatedFrom.goetheA2
          : source.generatedFrom.goetheB1,
    };
    promotedByTranslatedForm += 1;
    continue;
  }

  const duplicateMissingIndex = addedMissingByKey.get(
    `${translatedKey}:${translation.article ?? ""}`,
  );
  if (Number.isInteger(duplicateMissingIndex)) {
    const existing = missingCards[duplicateMissingIndex];
    if (official.goetheLevel === "A2" && existing.goetheLevel !== "A2") {
      missingCards[duplicateMissingIndex] = {
        ...existing,
        level: "A2",
        goetheLevel: "A2",
        goetheSourceUrl: source.generatedFrom.goetheA2,
        sourceLabel: "Goethe-Zertifikat A2 · Wortliste",
        sourceUrl: source.generatedFrom.goetheA2,
      };
    }
    collapsedOfficialVariants += 1;
    continue;
  }

  const card = {
    id,
    german: translation.german.trim(),
    polish: translation.polish.trim(),
    article: translation.article,
    plural: translation.plural?.trim() || null,
    exampleGerman: translation.exampleGerman.trim(),
    examplePolish: translation.examplePolish.trim(),
    category: translation.category,
    curriculumTier: "core",
    curriculumOrder: official.curriculumOrder,
    level: official.goetheLevel,
    goetheLevel: official.goetheLevel,
    goetheSourceUrl: official.sourceUrl,
    sourceLabel: `Goethe-Zertifikat ${official.goetheLevel} · Wortliste`,
    sourceUrl: official.sourceUrl,
    sourceGloss: official.headword,
    sourceLanguage: "de",
  };
  addedMissingByKey.set(
    `${translatedKey}:${translation.article ?? ""}`,
    missingCards.length,
  );
  missingCards.push(card);
}

const cards = [...mappedNicos, ...missingCards];
const cardIds = new Set(cards.map((card) => card.id));
if (cardIds.size !== cards.length) throw new Error("Powtórzone identyfikatory kart.");

const output = [
  'import type { CardContent } from "../types";',
  "",
  "// Generated official Goethe A2/B1 curriculum plus the preserved Nicos Weg library.",
  `export const goetheContents: CardContent[] = JSON.parse(${JSON.stringify(JSON.stringify(cards))}) as CardContent[];`,
  "",
  "export const goetheCategories = [",
  "  ...new Set(goetheContents.map((card) => card.category)),",
  "];",
  "",
].join("\n");
writeFileSync(resolve(root, "src/data/goetheCards.ts"), output);

console.log(JSON.stringify({
  translations: translations.length,
  translationFiles,
  totalCards: cards.length,
  preservedNicosCards: mappedNicos.length,
  officialCoreCards: cards.filter((card) => card.goetheLevel).length,
  addedGoetheCards: missingCards.length,
  promotedByTranslatedForm,
  collapsedOfficialVariants,
  a2CoreCards: cards.filter((card) => card.goetheLevel === "A2").length,
  b1CoreCards: cards.filter((card) => card.goetheLevel === "B1").length,
  extensionCards: cards.filter((card) => card.curriculumTier === "extension").length,
  specialistCards: cards.filter((card) => card.curriculumTier === "specialist").length,
}, null, 2));
