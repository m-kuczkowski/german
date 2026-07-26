import {
  extractResponseText,
  validateCount,
  validateGeneratedCards,
  validateTopic,
} from "./validation";

interface Env {
  SECRET_KEY: string;
  ALLOWED_ORIGIN?: string;
  MODEL?: string;
}

interface RateEntry {
  startedAt: number;
  count: number;
}

const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT = 8;
const OPENAI_TIMEOUT_MS = 25_000;
const rateEntries = new Map<string, RateEntry>();

function getAllowedOrigins(env: Env): string[] {
  return (env.ALLOWED_ORIGIN || "https://m-kuczkowski.github.io")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function corsHeaders(origin: string): HeadersInit {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Cache-Control": "no-store",
    Vary: "Origin",
  };
}

function json(
  body: Record<string, unknown>,
  status: number,
  origin: string,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(origin),
    },
  });
}

function isRateLimited(clientId: string, now = Date.now()): boolean {
  const entry = rateEntries.get(clientId);
  if (!entry || now - entry.startedAt >= RATE_WINDOW_MS) {
    rateEntries.set(clientId, { startedAt: now, count: 1 });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT;
}

function cardSchema(count: number) {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      cards: {
        type: "array",
        minItems: count,
        maxItems: count,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            german: { type: "string", minLength: 1, maxLength: 100 },
            polish: { type: "string", minLength: 1, maxLength: 160 },
            article: { type: ["string", "null"], enum: ["der", "die", "das", null] },
            plural: { type: ["string", "null"], maxLength: 100 },
            exampleGerman: { type: "string", minLength: 3, maxLength: 220 },
            examplePolish: { type: "string", minLength: 3, maxLength: 260 },
            category: { type: "string", minLength: 2, maxLength: 60 },
          },
          required: [
            "german",
            "polish",
            "article",
            "plural",
            "exampleGerman",
            "examplePolish",
            "category",
          ],
        },
      },
    },
    required: ["cards"],
  };
}

async function handleGenerate(request: Request, env: Env, origin: string): Promise<Response> {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 2_000) return json({ error: "Zapytanie jest zbyt duże." }, 413, origin);

  let body: { topic?: unknown; count?: unknown };
  try {
    body = (await request.json()) as { topic?: unknown; count?: unknown };
  } catch {
    return json({ error: "Nieprawidłowe dane zapytania." }, 400, origin);
  }

  const topic = validateTopic(body.topic);
  const count = validateCount(body.count);
  if (!topic || !count) {
    return json(
      { error: "Podaj temat od 2 do 80 znaków i wybierz 5, 10 albo 20 kart." },
      400,
      origin,
    );
  }

  const clientId =
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
    "unknown";
  if (isRateLimited(clientId)) {
    return json(
      { error: "Limit generatora został osiągnięty. Spróbuj ponownie za kilka minut." },
      429,
      origin,
    );
  }

  if (!env.SECRET_KEY) {
    return json({ error: "Generator AI nie został skonfigurowany." }, 503, origin);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

  try {
    const openAiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: env.MODEL || "gpt-5-nano",
        store: false,
        max_output_tokens: 6000,
        instructions:
          "Jesteś nauczycielem niemieckiego. Tworzysz praktyczne, poprawne fiszki wyłącznie na poziomie CEFR A2 dla polskojęzycznej osoby. Dla rzeczowników zawsze podawaj właściwy rodzajnik oraz liczbę mnogą. Dla słów bez rodzajnika lub naturalnej liczby mnogiej użyj null. Zdania mają być krótkie, naturalne i przydatne w codziennym życiu. Nie dodawaj objaśnień poza wymaganym JSON.",
        input: `Utwórz dokładnie ${count} różnych fiszek na temat: „${topic}”. Unikaj bardzo rzadkich słów i treści wykraczających poza A2.`,
        text: {
          format: {
            type: "json_schema",
            name: "a2_flashcards",
            strict: true,
            schema: cardSchema(count),
          },
        },
      }),
      signal: controller.signal,
    });

    if (!openAiResponse.ok) {
      return json({ error: "Generator AI jest chwilowo niedostępny." }, 502, origin);
    }

    const payload = (await openAiResponse.json()) as unknown;
    const outputText = extractResponseText(payload);
    if (!outputText) return json({ error: "Generator zwrócił pustą odpowiedź." }, 502, origin);

    let parsed: unknown;
    try {
      parsed = JSON.parse(outputText);
    } catch {
      return json({ error: "Generator zwrócił nieprawidłową odpowiedź." }, 502, origin);
    }

    const validated = validateGeneratedCards(parsed, count);
    if (!validated) return json({ error: "Nie udało się zweryfikować wygenerowanych kart." }, 502, origin);

    return json(
      {
        cards: validated.map((card) => ({ ...card, id: crypto.randomUUID() })),
      },
      200,
      origin,
    );
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return json({ error: "Generator odpowiadał zbyt długo. Spróbuj ponownie." }, 504, origin);
    }
    return json({ error: "Nie udało się połączyć z generatorem AI." }, 502, origin);
  } finally {
    clearTimeout(timeout);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    if (!getAllowedOrigins(env).includes(origin)) {
      return new Response("Forbidden", { status: 403 });
    }

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (url.pathname !== "/api/generate-cards" || request.method !== "POST") {
      return json({ error: "Nie znaleziono endpointu." }, 404, origin);
    }
    return handleGenerate(request, env, origin);
  },
};
