#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const sourcePath = resolve(process.argv[2] ?? "data/nicosWegSource.json");
const outputPath = resolve(process.argv[3] ?? "data/nicosWegTranslations.json");
const apiKey = process.env.OPENAI_API_KEY;
const model = process.env.OPENAI_MODEL ?? "gpt-5.6";
const batchSize = Number.parseInt(process.env.TRANSLATION_BATCH_SIZE ?? "25", 10);

function reportFailure(error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`::error title=Static translation generation failed::${message.replace(/\r?\n/g, " ")}`);
}

process.on("uncaughtException", (error) => {
  reportFailure(error);
  process.exit(1);
});

process.on("unhandledRejection", (error) => {
  reportFailure(error);
  process.exit(1);
});

if (!apiKey) throw new Error("Brakuje OPENAI_API_KEY.");
if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 50) {
  throw new Error("TRANSLATION_BATCH_SIZE musi być liczbą od 1 do 50.");
}

const source = JSON.parse(readFileSync(sourcePath, "utf8"));
if (!Array.isArray(source.cards) || source.cards.length !== 3038) {
  throw new Error("Plik źródłowy musi zawierać dokładnie 3038 kart.");
}

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["translations"],
  properties: {
    translations: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "polish", "exampleGerman", "examplePolish"],
        properties: {
          id: { type: "string" },
          polish: { type: "string" },
          exampleGerman: { type: "string" },
          examplePolish: { type: "string" },
        },
      },
    },
  },
};

const system = [
  "You are a meticulous German-to-Polish language editor for adult learners.",
  "Use your own linguistic competence only: do not use web search, dictionaries, translators, or tools.",
  "Return one translation for every supplied input ID, preserving it exactly and in the same order.",
  "polish must be concise, natural Polish that captures the supplied sense.",
  "exampleGerman must be one natural sentence, appropriate to the card level, and use the target German word or expression; inflect it only if grammar requires.",
  "examplePolish must be a complete, natural Polish translation of exampleGerman.",
  "Before responding, check every ID, meaning, sentence, and sentence translation.",
].join(" ");

async function requestBatch(cards, attempt = 1) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      store: false,
      max_output_tokens: 20000,
      input: [
        { role: "system", content: system },
        {
          role: "user",
          content: JSON.stringify({
            task: "Translate the following flashcard records into the required structured output.",
            cards,
          }),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "flashcard_translations",
          strict: true,
          schema,
        },
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    if (attempt < 4 && (response.status === 429 || response.status >= 500)) {
      await new Promise((resolveDelay) => setTimeout(resolveDelay, attempt * 3000));
      return requestBatch(cards, attempt + 1);
    }
    throw new Error(`OpenAI Responses API ${response.status}: ${detail.slice(0, 500)}`);
  }

  const payload = await response.json();
  if (payload.status === "incomplete") {
    throw new Error(`Niekompletna odpowiedź modelu: ${payload.incomplete_details?.reason ?? "brak powodu"}.`);
  }
  if (typeof payload.output_text !== "string") {
    throw new Error("Model nie zwrócił tekstu strukturalnego.");
  }

  const parsed = JSON.parse(payload.output_text);
  const translations = parsed.translations;
  const expectedIds = cards.map((card) => card.id);
  const receivedIds = Array.isArray(translations) ? translations.map((entry) => entry.id) : [];
  if (
    !Array.isArray(translations) ||
    receivedIds.length !== expectedIds.length ||
    receivedIds.some((id, index) => id !== expectedIds[index]) ||
    translations.some(
      (entry) =>
        !entry.polish?.trim() ||
        !entry.exampleGerman?.trim() ||
        !entry.examplePolish?.trim(),
    )
  ) {
    throw new Error("Model zwrócił niepełną lub nieuporządkowaną paczkę tłumaczeń.");
  }
  return translations;
}

const translations = [];
for (let index = 0; index < source.cards.length; index += batchSize) {
  const cards = source.cards.slice(index, index + batchSize);
  const batch = await requestBatch(cards);
  translations.push(...batch);
  console.log(`Przetłumaczono ${translations.length}/${source.cards.length}.`);
}

writeFileSync(outputPath, `${JSON.stringify({ schemaVersion: 1, translations }, null, 2)}\n`);
console.log(`Zapisano ${translations.length} tłumaczeń do ${outputPath}.`);
