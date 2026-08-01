#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { applyCurriculumHierarchy, hierarchyFamilyCount } from "./curriculum-hierarchy.mjs";

const cardsPath = resolve(process.argv[2] ?? "src/data/nicosWegCards.ts");
const generated = readFileSync(cardsPath, "utf8");
const match = generated.match(/JSON\.parse\((.*)\) as CardContent\[\];/);
if (!match) throw new Error("Nie udało się odczytać wygenerowanych kart.");

const cards = JSON.parse(JSON.parse(match[1]));

const naturalSlashPhrases = new Map([
  ["(auf etwas/jemanden) an|stoßen", "anstoßen (auf etwas oder jemanden)"],
  ["(auf etwas/jemanden) neugierig", "neugierig (auf etwas oder jemanden)"],
  ["(auf jemanden/etwas) stolz sein", "stolz sein (auf jemanden oder etwas)"],
  ["(etwas/jemanden) fotografieren", "fotografieren (etwas oder jemanden)"],
  ["(etwas/jemanden) kritisieren", "kritisieren (etwas oder jemanden)"],
  ["(jemandem/etwas) zu|stimmen", "zustimmen (jemandem oder etwas)"],
  ["(jemanden/etwas) zeichnen", "zeichnen (jemanden oder etwas)"],
  ["(unter etwas/jemandem) leiden", "leiden (unter etwas oder jemandem)"],
  ["als etwas/jemand gelten", "gelten (als etwas oder jemand)"],
  ["an etwas/jemanden denken", "denken (an etwas oder jemanden)"],
  ["auf etwas/jemanden achten", "achten (auf etwas oder jemanden)"],
  ["auf etwas/jemanden auf|passen", "aufpassen (auf etwas oder jemanden)"],
  ["auf/in etwas landen", "landen (auf oder in etwas)"],
  ["ein falsches Bild von etwas/jemandem haben", "ein falsches Bild haben (von etwas oder jemandem)"],
  ["etwas/jemandem zum Opfer fallen", "zum Opfer fallen (jemandem oder etwas)"],
  ["etwas/jemanden akzeptieren", "akzeptieren (etwas oder jemanden)"],
  ["etwas/jemanden an|erkennen", "anerkennen (etwas oder jemanden)"],
  ["etwas/jemanden an|fahren", "anfahren (etwas oder jemanden)"],
  ["etwas/jemanden aus|beuten", "ausbeuten (etwas oder jemanden)"],
  ["etwas/jemanden aus|wählen", "auswählen (etwas oder jemanden)"],
  ["etwas/jemanden befreien", "befreien (etwas oder jemanden)"],
  ["etwas/jemanden begleiten", "begleiten (etwas oder jemanden)"],
  ["etwas/jemanden belasten", "belasten (etwas oder jemanden)"],
  ["etwas/jemanden beobachten", "beobachten (etwas oder jemanden)"],
  ["etwas/jemanden beschreiben", "beschreiben (etwas oder jemanden)"],
  ["etwas/jemanden besiegen", "besiegen (etwas oder jemanden)"],
  ["etwas/jemanden betreuen", "betreuen (etwas oder jemanden)"],
  ["etwas/jemanden ernst nehmen", "ernst nehmen (etwas oder jemanden)"],
  ["etwas/jemanden fördern", "fördern (etwas oder jemanden)"],
  ["etwas/jemanden googeln", "googeln (etwas oder jemanden)"],
  ["etwas/jemanden ignorieren", "ignorieren (etwas oder jemanden)"],
  ["etwas/jemanden meinen", "meinen (etwas oder jemanden)"],
  ["etwas/jemanden raus|bringen", "rausbringen (etwas oder jemanden)"],
  ["etwas/jemanden respektieren", "respektieren (etwas oder jemanden)"],
  ["etwas/jemanden schätzen", "schätzen (etwas oder jemanden)"],
  ["etwas/jemanden testen", "testen (etwas oder jemanden)"],
  ["etwas/jemanden unterstützen", "unterstützen (etwas oder jemanden)"],
  ["etwas/jemanden verändern", "verändern (etwas oder jemanden)"],
  ["etwas/jemanden vergessen", "vergessen (etwas oder jemanden)"],
  ["etwas/jemanden verlassen", "verlassen (etwas oder jemanden)"],
  ["etwas/jemanden verstecken", "verstecken (etwas oder jemanden)"],
  ["etwas/jemanden verwechseln", "verwechseln (etwas oder jemanden)"],
  ["etwas/jemanden wählen", "wählen (etwas oder jemanden)"],
  ["etwas/jemanden weg|bringen", "wegbringen (etwas oder jemanden)"],
  ["für etwas/jemanden verantwortlich sein", "verantwortlich sein (für etwas oder jemanden)"],
  ["für/gegen etwas demonstrieren", "demonstrieren (für oder gegen etwas)"],
  ["jemandem/etwas schaden", "schaden (jemandem oder etwas)"],
  ["jemanden an etwas/jemanden erinnern", "erinnern (jemanden an etwas oder jemanden)"],
  ["jemanden/etwas ab|holen", "abholen (jemanden oder etwas)"],
  ["jemanden/etwas dar|stellen", "darstellen (jemanden oder etwas)"],
  ["jemanden/etwas entdecken", "entdecken (jemanden oder etwas)"],
  ["jemanden/etwas erkennen", "erkennen (jemanden oder etwas)"],
  ["jemanden/etwas erwarten", "erwarten (jemanden oder etwas)"],
  ["mit etwas/jemandem einverstanden sein", "einverstanden sein (mit etwas oder jemandem)"],
  ["mit jemandem/etwas zurecht|kommen", "zurechtkommen (mit jemandem oder etwas)"],
  ["rechts/links ab|biegen", "abbiegen (nach rechts oder links)"],
  ["Rücksicht (auf etwas/jemanden) nehmen", "Rücksicht nehmen (auf etwas oder jemanden)"],
  ["Rücksicht auf etwas/jemanden nehmen", "Rücksicht nehmen (auf etwas oder jemanden)"],
  ["sich (über etwas/jemanden) auf|regen", "sich aufregen (über etwas oder jemanden)"],
  ["sich (um jemanden/etwas) Sorgen machen", "sich Sorgen machen (um jemanden oder etwas)"],
  ["sich an etwas/jemanden gewöhnen", "sich gewöhnen (an etwas oder jemanden)"],
  ["sich an jemanden/etwas erinnern", "sich erinnern (an jemanden oder etwas)"],
  ["sich auf etwas/jemanden freuen", "sich freuen (auf etwas oder jemanden)"],
  ["sich auf etwas/jemanden verlassen", "sich verlassen (auf etwas oder jemanden)"],
  [
    "sich bei jemandem über jemanden/etwas beschweren",
    "sich beschweren (bei jemandem über jemanden oder etwas)",
  ],
  ["sich für etwas/jemanden interessieren", "sich interessieren (für etwas oder jemanden)"],
  ["sich gut/schlecht verkaufen", "sich gut oder schlecht verkaufen"],
  ["sich über jemanden/etwas ärgern", "sich ärgern (über jemanden oder etwas)"],
  ["sich um etwas/jemanden kümmern", "sich kümmern (um etwas oder jemanden)"],
  ["solcher/solche/solches", "solcher, solche, solches"],
  ["über etwas/jemanden nach|denken", "nachdenken (über etwas oder jemanden)"],
  ["zu etwas/jemandem gehören", "gehören (zu etwas oder jemandem)"],
  ["zu jemandem/etwas passen", "passen (zu jemandem oder etwas)"],
]);

const translationCorrections = new Map([
  ["nicos-a2-d2c4975b3456", { polish: "wrócić; wracać" }],
  [
    "nicos-a2-7ecd4eacc8a5",
    {
      german: "zuhören (jemandem)",
      polish: "słuchać kogoś uważnie",
      examplePolish: "Posłuchaj mnie przez chwilę.",
    },
  ],
  ["nicos-a2-3e7af31ad03f", { polish: "zapomnieć o czymś lub o kimś" }],
  [
    "nicos-a2-5002c2488e02",
    {
      polish: "Czy może mi pan powiedzieć, gdzie jest dworzec?",
      examplePolish: "Czy może mi pan powiedzieć, gdzie jest dworzec?",
    },
  ],
  [
    "nicos-a2-cd3cd74c989a",
    {
      german: "Das meinen Sie nicht ernst.",
      polish: "Chyba nie mówi pan poważnie.",
      article: null,
      examplePolish: "Chyba nie mówi pan poważnie.",
    },
  ],
  ["nicos-b1-fcbe6f0db6d6", { polish: "wylądować na czymś lub w czymś" }],
  [
    "nicos-b1-6866952d6fb9",
    { examplePolish: "Wielu pracowników migrujących przyjechało do Niemiec w latach sześćdziesiątych." },
  ],
]);

const genderTranslationCorrections = new Map([
  ["nicos-b1-71b9906238ab", "kosmetyczka"],
  ["nicos-b1-6866952d6fb9", "pracownik migrujący"],
  ["nicos-b1-53cd17444542", "nazista"],
]);

function genderPair(card) {
  if (!card.german.includes("/") || !/,\s*-/.test(card.german)) return null;
  const parts = card.german.split("/");
  if (parts.length !== 2) return null;

  const forms = parts.map((part) =>
    part
      .replace(/,\s*.*$/, "")
      .replace(/\s+-[A-Za-zÄÖÜäöüß]+$/, "")
      .trim(),
  );
  const example = card.exampleGerman.toLocaleLowerCase("de-DE");
  const selectedIndex = example.includes(forms[1].toLocaleLowerCase("de-DE")) ? 1 : 0;
  const polishForms = card.polish.split(";").map((value) => value.trim());
  const polish = genderTranslationCorrections.get(card.id) ??
    (polishForms.length === 2 ? polishForms[selectedIndex] : card.polish);

  return {
    german: forms[selectedIndex],
    polish,
    article: selectedIndex === 1 ? "die" : "der",
    plural: null,
  };
}

let pipeCards = 0;
let slashCards = 0;
let genderCards = 0;
let translationCards = 0;

const curated = cards.map((card) => {
  const originalGerman = card.german;
  let next = { ...card };

  if (originalGerman.includes("|")) pipeCards += 1;
  if (originalGerman.includes("/")) slashCards += 1;

  const selectedGender = genderPair(card);
  if (selectedGender) {
    genderCards += 1;
    next = { ...next, ...selectedGender };
  } else if (originalGerman.includes("/")) {
    const natural = naturalSlashPhrases.get(originalGerman);
    if (!natural) throw new Error(`Brakuje ręcznej korekty dla: ${originalGerman}`);
    next.german = natural;
  } else {
    next.german = originalGerman.replace(/\|/g, "");
  }

  const correction = translationCorrections.get(card.id);
  if (correction) {
    translationCards += 1;
    next = { ...next, ...correction };
  }

  return next;
});

const hierarchical = applyCurriculumHierarchy(curated);
const invalid = hierarchical.filter((card) => /[|/]/.test(card.german) || /[|/]/.test(card.polish));
if (invalid.length) {
  throw new Error(
    `Po korekcie pozostały techniczne separatory: ${invalid
      .slice(0, 10)
      .map((card) => card.id)
      .join(", ")}`,
  );
}

const output = `import type { CardContent } from "../types";

// Generated from all 3038 notes in the two public AnkiWeb decks.
// Polish translations were created in a separate AI translation pass.
export const nicosWegContents: CardContent[] = JSON.parse(${JSON.stringify(
  JSON.stringify(hierarchical),
)}) as CardContent[];

export const nicosWegCategories = [
  ...new Set(nicosWegContents.map((card) => card.category)),
];
`;

writeFileSync(cardsPath, output);
console.log(
  JSON.stringify({
    cards: curated.length,
    pipeCards,
    slashCards,
    genderCards,
    translationCards,
    hierarchyFamilyCount,
    hierarchyCards: hierarchical.filter((card) => card.wordFamilyId).length,
    remainingTechnicalSeparators: invalid.length,
  }),
);
