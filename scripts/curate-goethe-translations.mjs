#!/usr/bin/env node

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const overrides = new Map([
  [
    "goethe-60edc87a5e0a",
    {
      german: "Zahnpasta",
      exampleGerman: "Die neue Zahnpasta riecht sehr gut.",
      examplePolish: "Nowa pasta do zębów bardzo ładnie pachnie.",
    },
  ],
  [
    "goethe-5961817f761a",
    {
      german: "Zeug",
      exampleGerman: "Ich habe dein ganzes Zeug in dein Zimmer getan.",
      examplePolish: "Przeniosłem wszystkie twoje rzeczy do twojego pokoju.",
    },
  ],
  [
    "goethe-9bdd3709fc92",
    {
      polish: "zwracać się do kogoś per pan lub pani",
    },
  ],
]);

const files = readdirSync(resolve("data"))
  .filter((name) => /^goetheTranslations-\d{3}\.json$/.test(name))
  .sort();
const applied = new Set();

for (const file of files) {
  const path = resolve("data", file);
  const payload = JSON.parse(readFileSync(path, "utf8"));
  payload.translations = payload.translations.map((translation) => {
    const override = overrides.get(translation.id);
    if (!override) return translation;
    applied.add(translation.id);
    return { ...translation, ...override };
  });
  writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`);
}

const missingOverrides = [...overrides.keys()].filter((id) => !applied.has(id));
if (missingOverrides.length) {
  throw new Error(`Nie zastosowano korekt: ${missingOverrides.join(", ")}`);
}
console.log(JSON.stringify({ files: files.length, corrected: applied.size }, null, 2));
