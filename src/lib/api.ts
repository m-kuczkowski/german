import type { CardContent, GeneratedCardsResponse } from "../types";
import { validateCardContent } from "./cards";

const TIMEOUT_MS = 20_000;

export class AiGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiGenerationError";
  }
}

export async function generateCards(
  topic: string,
  count: 5 | 10 | 20,
  apiBase = import.meta.env.VITE_API_URL,
  fetcher: typeof fetch = fetch,
): Promise<CardContent[]> {
  if (!apiBase) {
    throw new AiGenerationError("Generator AI nie został jeszcze skonfigurowany.");
  }
  if (typeof window !== "undefined" && typeof navigator !== "undefined" && !navigator.onLine) {
    throw new AiGenerationError("Generator AI wymaga połączenia z internetem.");
  }

  const controller = new AbortController();
  const timer = globalThis.setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetcher(`${apiBase.replace(/\/$/, "")}/api/generate-cards`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic: topic.trim(), count }),
      signal: controller.signal,
    });

    const payload = (await response.json().catch(() => null)) as
      | (GeneratedCardsResponse & { error?: string })
      | null;

    if (!response.ok) {
      throw new AiGenerationError(
        payload?.error || "Nie udało się wygenerować fiszek. Spróbuj ponownie.",
      );
    }
    if (!payload || !Array.isArray(payload.cards) || !payload.cards.every(validateCardContent)) {
      throw new AiGenerationError("Generator zwrócił nieprawidłowe fiszki.");
    }
    return payload.cards;
  } catch (error) {
    if (error instanceof AiGenerationError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new AiGenerationError("Generator odpowiadał zbyt długo. Spróbuj ponownie.");
    }
    throw new AiGenerationError("Brak połączenia z generatorem AI.");
  } finally {
    globalThis.clearTimeout(timer);
  }
}
