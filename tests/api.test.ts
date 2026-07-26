import { describe, expect, it, vi } from "vitest";
import { AiGenerationError, generateCards } from "../src/lib/api";

const validCard = {
  id: "ai-1",
  german: "Zahnarzt",
  polish: "dentysta",
  article: "der" as const,
  plural: "Zahnärzte",
  exampleGerman: "Ich habe einen Termin beim Zahnarzt.",
  examplePolish: "Mam wizytę u dentysty.",
  category: "Zdrowie",
};

describe("klient generatora AI", () => {
  it("odbiera i waliduje karty", async () => {
    const fetcher = vi.fn(async () =>
      new Response(JSON.stringify({ cards: [validCard] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ) as unknown as typeof fetch;

    const result = await generateCards("dentysta", 5, "https://api.example.test", fetcher);
    expect(result[0].german).toBe("Zahnarzt");
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("pokazuje przyjazny błąd backendu", async () => {
    const fetcher = vi.fn(async () =>
      new Response(JSON.stringify({ error: "Limit generatora został osiągnięty." }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      }),
    ) as unknown as typeof fetch;

    await expect(generateCards("podróż", 5, "https://api.example.test", fetcher)).rejects.toEqual(
      new AiGenerationError("Limit generatora został osiągnięty."),
    );
  });

  it("działa bez API dzięki jasnemu komunikatowi konfiguracji", async () => {
    await expect(generateCards("dom", 5, "")).rejects.toThrow(
      "Generator AI nie został jeszcze skonfigurowany.",
    );
  });
});
