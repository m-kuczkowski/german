const CATEGORIES = {
  finance: "Finanse i usługi (Geld und Dienstleistungen)",
  health: "Zdrowie i bezpieczeństwo (Gesundheit und Sicherheit)",
  home: "Dom i mieszkanie (Wohnen und Haushalt)",
  nature: "Przyroda i środowisko (Natur und Umwelt)",
  travel: "Podróże i miasto (Reisen und Stadt)",
  work: "Praca i kariera (Arbeit und Karriere)",
};

const FAMILIES = [
  {
    id: "pflege",
    category: CATEGORIES.health,
    members: [
      { id: "nicos-a2-8132eb42ae5b", role: "base", promote: true },
      { id: "nicos-b1-7c8fba159d9f", role: "derived", prerequisites: ["nicos-a2-8132eb42ae5b"], promote: true },
      { id: "nicos-a2-36e3f2307fc5", role: "compound", prerequisites: ["nicos-b1-7c8fba159d9f"], parts: [["Alten", "osoby starsze"], ["Pfleger", "opiekun"]] },
      { id: "nicos-a2-d437f395dff4", role: "compound", prerequisites: ["nicos-b1-7c8fba159d9f"], parts: [["Alten", "osoby starsze"], ["Pflegerin", "opiekunka"]] },
      { id: "nicos-a2-f683b0c5950e", role: "compound", prerequisites: ["nicos-b1-7c8fba159d9f"], parts: [["Pflege", "opieka"], ["Dienst", "służba"]] },
      { id: "nicos-a2-4ec3d0495161", role: "compound", prerequisites: ["nicos-b1-7c8fba159d9f"], parts: [["Pflege", "opieka"], ["Heim", "dom lub ośrodek"]] },
      { id: "nicos-a2-ff006bc1f0d9", role: "compound", prerequisites: ["nicos-b1-7c8fba159d9f", "nicos-a2-ebc260eb8825"], parts: [["Pflege", "opieka"], ["Versicherung", "ubezpieczenie"]] },
    ],
  },
  {
    id: "versicherung",
    category: CATEGORIES.finance,
    members: [
      { id: "nicos-a2-ebc260eb8825", role: "base", promote: true },
      { id: "nicos-a2-62dc138e4d3c", role: "derived", prerequisites: ["nicos-a2-ebc260eb8825"] },
      { id: "nicos-a2-8a0381e428ef", role: "compound", prerequisites: ["nicos-a2-ebc260eb8825"], parts: [["Arbeitslose", "osoby bezrobotne"], ["Versicherung", "ubezpieczenie"]] },
      { id: "nicos-a2-e580067a0286", role: "compound", prerequisites: ["nicos-a2-ebc260eb8825"], parts: [["Rente", "emerytura"], ["Versicherung", "ubezpieczenie"]] },
      { id: "nicos-a2-8c0cc816c105", role: "compound", prerequisites: ["nicos-a2-ebc260eb8825"], parts: [["Sozial", "społeczny"], ["Versicherung", "ubezpieczenie"]] },
    ],
  },
  {
    id: "bewerbung",
    category: CATEGORIES.work,
    members: [
      { id: "nicos-a2-09d0298a0c7a", role: "base", promote: true },
      { id: "nicos-a2-0f5617c861ef", role: "derived", prerequisites: ["nicos-a2-09d0298a0c7a"] },
      { id: "nicos-a2-2839cde84494", role: "derived", prerequisites: ["nicos-a2-09d0298a0c7a"] },
      { id: "nicos-a2-bc4eb33a55e9", role: "derived", prerequisites: ["nicos-a2-09d0298a0c7a"] },
      { id: "nicos-a2-ab798ed0ed59", role: "compound", prerequisites: ["nicos-a2-0f5617c861ef"], parts: [["Bewerbung", "aplikacja"], ["Gespräch", "rozmowa"]] },
      { id: "nicos-b1-85f119221edf", role: "compound", prerequisites: ["nicos-a2-0f5617c861ef"], parts: [["Bewerbung", "aplikacja"], ["Schluss", "koniec lub termin"]] },
      { id: "nicos-b1-e9871d256b3c", role: "compound", prerequisites: ["nicos-a2-0f5617c861ef"], parts: [["Bewerbung", "aplikacja"], ["Unterlagen", "dokumenty"]] },
    ],
  },
  {
    id: "umwelt",
    category: CATEGORIES.nature,
    members: [
      { id: "nicos-a2-b048864edfc2", role: "base", promote: true },
      { id: "nicos-a2-cd5a82a5c4c2", role: "compound", prerequisites: ["nicos-a2-b048864edfc2"], parts: [["Umwelt", "środowisko"], ["freundlich", "przyjazny"]] },
      { id: "nicos-b1-e46c3c6f76b1", role: "compound", prerequisites: ["nicos-a2-b048864edfc2"], parts: [["Umwelt", "środowisko"], ["Belastung", "obciążenie"]] },
      { id: "nicos-b1-9b5bd865fd1b", role: "derived", prerequisites: ["nicos-a2-b048864edfc2"] },
      { id: "nicos-b1-3b48c3b68a3b", role: "compound", prerequisites: ["nicos-a2-b048864edfc2"], parts: [["Umwelt", "środowisko"], ["Bewusstsein", "świadomość"]] },
      { id: "nicos-b1-9d271a1e15d6", role: "compound", prerequisites: ["nicos-a2-b048864edfc2"], parts: [["Umwelt", "środowisko"], ["freundlich", "przyjazny"]] },
      { id: "nicos-b1-d893e5c44dad", role: "compound", prerequisites: ["nicos-a2-b048864edfc2"], parts: [["Umwelt", "środowisko"], ["schädlich", "szkodliwy"]] },
      { id: "nicos-b1-5b1e58bfea49", role: "compound", prerequisites: ["nicos-a2-b048864edfc2"], parts: [["Umwelt", "środowisko"], ["Schutz", "ochrona"]] },
    ],
  },
  {
    id: "miete",
    category: CATEGORIES.home,
    members: [
      { id: "nicos-a2-bdce179fd38a", role: "base", promote: true },
      { id: "nicos-b1-6710ed341f0e", role: "derived", prerequisites: ["nicos-a2-bdce179fd38a"] },
      { id: "nicos-a2-32f38a4a0bcb", role: "derived", prerequisites: ["nicos-a2-bdce179fd38a"] },
      { id: "nicos-a2-082ab78f1555", role: "derived", prerequisites: ["nicos-a2-bdce179fd38a"] },
      { id: "nicos-a2-3e88749cc3fb", role: "compound", prerequisites: ["nicos-a2-bdce179fd38a"], parts: [["Miete", "czynsz"], ["Erhöhung", "podwyżka"]] },
      { id: "nicos-a2-e4363d3ffa70", role: "compound", prerequisites: ["nicos-a2-bdce179fd38a"], parts: [["kalt", "bez dodatkowych opłat"], ["Miete", "czynsz"]] },
      { id: "nicos-a2-47312d8ba4ed", role: "compound", prerequisites: ["nicos-a2-bdce179fd38a"], parts: [["Monat", "miesiąc"], ["Miete", "czynsz"]] },
      { id: "nicos-a2-0e277ed68abf", role: "compound", prerequisites: ["nicos-a2-bdce179fd38a"], parts: [["warm", "z dodatkowymi opłatami"], ["Miete", "czynsz"]] },
    ],
  },
  {
    id: "flug",
    category: CATEGORIES.travel,
    members: [
      { id: "nicos-a2-a32d0966e538", role: "base", promote: true },
      { id: "nicos-a2-5ad155bb1d4a", role: "compound", prerequisites: ["nicos-a2-a32d0966e538"], parts: [["hin", "tam"], ["Flug", "lot"]] },
      { id: "nicos-a2-7334b7e51bde", role: "compound", prerequisites: ["nicos-a2-a32d0966e538"], parts: [["zurück", "z powrotem"], ["Flug", "lot"]] },
    ],
  },
  {
    id: "zahlung",
    category: CATEGORIES.finance,
    members: [
      { id: "nicos-a2-a37f4a6db6c7", role: "base", promote: true },
      { id: "nicos-a2-5e8d41457cc1", role: "derived", prerequisites: ["nicos-a2-a37f4a6db6c7"], parts: [["aus", "na zewnątrz"], ["Zahlung", "płatność"]] },
      { id: "nicos-a2-f9e5c6f8c865", role: "derived", prerequisites: ["nicos-a2-a37f4a6db6c7"], parts: [["ein", "do środka"], ["Zahlung", "płatność"]] },
      { id: "nicos-b1-7834037a9343", role: "derived", prerequisites: ["nicos-a2-a37f4a6db6c7"] },
      { id: "nicos-b1-ae2d32471a5f", role: "derived", prerequisites: ["nicos-a2-a37f4a6db6c7"] },
      { id: "nicos-b1-d1128042cf89", role: "derived", prerequisites: ["nicos-a2-a37f4a6db6c7"] },
    ],
  },
  {
    id: "wohnung",
    category: CATEGORIES.home,
    members: [
      { id: "nicos-a2-0c2d6220e9f4", role: "base", promote: true },
      { id: "nicos-b1-2b0931f57c61", role: "compound", prerequisites: ["nicos-a2-0c2d6220e9f4"], parts: [["Wohnung", "mieszkanie"], ["Markt", "rynek"]] },
      { id: "nicos-b1-82a57c9cc987", role: "compound", prerequisites: ["nicos-a2-0c2d6220e9f4"], parts: [["Wohnungsbau", "budownictwo mieszkaniowe"], ["Projekt", "projekt"]] },
    ],
  },
];

export function applyCurriculumHierarchy(cards) {
  const byId = new Map(cards.map((card) => [card.id, card]));
  const patches = new Map();

  for (const family of FAMILIES) {
    for (const member of family.members) {
      if (!byId.has(member.id)) throw new Error(`Brak karty hierarchii: ${member.id}`);
      if (patches.has(member.id)) throw new Error(`Karta należy do dwóch rodzin: ${member.id}`);
      for (const prerequisiteId of member.prerequisites ?? []) {
        if (!byId.has(prerequisiteId)) throw new Error(`Brak podstawy hierarchii: ${prerequisiteId}`);
      }
      patches.set(member.id, {
        wordFamilyId: family.id,
        wordFamilyRole: member.role,
        prerequisiteIds: member.prerequisites ?? [],
        ...(member.parts ? {
          wordParts: member.parts.map(([german, polish]) => ({ german, polish })),
        } : {}),
        category: family.category,
        ...(member.promote ? { curriculumTier: "core" } : {}),
      });
    }
  }

  return cards.map((card) => ({ ...card, ...(patches.get(card.id) ?? {}) }));
}

export const hierarchyFamilyCount = FAMILIES.length;

