#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function readGeneratedCards(path) {
  const generated = readFileSync(resolve(path), "utf8");
  const match = generated.match(/JSON\.parse\((.*)\) as CardContent\[\];/);
  if (!match) throw new Error(`Nie udało się odczytać kart z ${path}.`);
  return JSON.parse(JSON.parse(match[1]));
}

function nicosCardId(sourceCard) {
  const [deckId, noteId] = sourceCard.id.split(":");
  const hash = createHash("sha1")
    .update(`${deckId}:${noteId}`)
    .digest("hex")
    .slice(0, 12);
  return `nicos-${sourceCard.level.toLowerCase()}-${hash}`;
}

function isDefiniteArticleSentence(value) {
  return /^(der|die|das)\s+/i.test(value)
    && /[.!?…]$/.test(value.trim())
    && !/\((m|f|n)\.[^)]*\)\s*$/i.test(value);
}

const cards = readGeneratedCards("src/data/goetheCards.ts");
const sourceCards = JSON.parse(readFileSync(resolve("data/nicosWegSource.json"), "utf8")).cards;
const cardsById = new Map(cards.map((card) => [card.id, card]));

const articleSentenceMismatches = sourceCards
  .filter((card) => isDefiniteArticleSentence(card.german))
  .map((sourceCard) => ({ sourceCard, card: cardsById.get(nicosCardId(sourceCard)) }))
  .filter(({ sourceCard, card }) => !card || card.german !== sourceCard.german || card.article !== null)
  .map(({ sourceCard }) => nicosCardId(sourceCard));

const technicalSeparators = cards
  .filter((card) => /[|/]/.test(card.german) || /[|/]/.test(card.polish))
  .map((card) => card.id);

const malformedCards = cards
  .filter((card) => {
    const balancedParentheses = (card.german.match(/\(/g) ?? []).length === (card.german.match(/\)/g) ?? []).length;
    return !balancedParentheses
      || !card.german?.trim()
      || !card.polish?.trim()
      || !card.exampleGerman?.trim()
      || !card.examplePolish?.trim();
  })
  .map((card) => card.id);

const report = {
  cards: cards.length,
  definiteArticleSentences: sourceCards.filter((card) => isDefiniteArticleSentence(card.german)).length,
  articleSentenceMismatches,
  technicalSeparators,
  malformedCards,
};

console.log(JSON.stringify(report, null, 2));

if (articleSentenceMismatches.length || technicalSeparators.length || malformedCards.length) {
  process.exit(1);
}
