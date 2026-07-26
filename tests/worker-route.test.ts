import { describe, expect, it } from "vitest";
import worker from "../worker/src/index";

const env = {
  SECRET_KEY: "test-only-never-sent",
  ALLOWED_ORIGIN: "https://m-kuczkowski.github.io",
  MODEL: "gpt-5-nano",
};

describe("endpoint Workera", () => {
  it("odrzuca obcy origin bez nagłówków CORS", async () => {
    const response = await worker.fetch(
      new Request("https://worker.example/api/generate-cards", {
        method: "POST",
        headers: {
          Origin: "https://attacker.example",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ topic: "dom", count: 5 }),
      }),
      env,
    );
    expect(response.status).toBe(403);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("obsługuje preflight tylko dla dozwolonej strony", async () => {
    const response = await worker.fetch(
      new Request("https://worker.example/api/generate-cards", {
        method: "OPTIONS",
        headers: { Origin: "https://m-kuczkowski.github.io" },
      }),
      env,
    );
    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://m-kuczkowski.github.io",
    );
  });

  it("odrzuca nieprawidłowy temat przed wywołaniem OpenAI", async () => {
    const response = await worker.fetch(
      new Request("https://worker.example/api/generate-cards", {
        method: "POST",
        headers: {
          Origin: "https://m-kuczkowski.github.io",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ topic: "x", count: 15 }),
      }),
      env,
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Podaj temat od 2 do 80 znaków i wybierz 5, 10 albo 20 kart.",
    });
  });
});
