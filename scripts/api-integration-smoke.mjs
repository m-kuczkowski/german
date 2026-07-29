import { createHash, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { neon } from "@neondatabase/serverless";

function loadEnv(name) {
  const envFile = process.env.WORTSCHATZ_ENV_FILE || ".env.local";
  const line = readFileSync(resolve(envFile), "utf8")
    .split(/\r?\n/)
    .find((item) => item.startsWith(`${name}=`));
  return line ? line.slice(name.length + 1).replace(/^"|"$/g, "") : undefined;
}

const databaseUrl =
  process.env.DATABASE_URL ||
  loadEnv("DATABASE_URL") ||
  process.env.DATABASE_URL_UNPOOLED ||
  loadEnv("DATABASE_URL_UNPOOLED");
if (!databaseUrl) throw new Error("Brakuje DATABASE_URL w pliku środowiskowym.");
process.env.DATABASE_URL = databaseUrl;

const { default: handler } = await import("../api/learning.js");
const sql = neon(databaseUrl);

function response() {
  return {
    statusCode: 200,
    headers: {},
    payload: undefined,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(value) {
      this.payload = value;
      return this;
    },
    end() {
      return this;
    },
  };
}

async function request(method, name, body, device) {
  const req = {
    method,
    body,
    headers: {
      "x-learning-profile-name": encodeURIComponent(name),
      ...(device ? {
        "x-learning-device-id": device.id,
        "x-learning-device-token": device.token,
      } : {}),
    },
  };
  const res = response();
  await handler(req, res);
  if (res.statusCode >= 400) {
    throw new Error(`API ${method} zwróciło ${res.statusCode}: ${JSON.stringify(res.payload)}`);
  }
  return res;
}

function randomLetters() {
  return [...randomBytes(6)].map((value) => String.fromCharCode(97 + (value % 26))).join("");
}

const testName = `Test Migracji ${randomLetters()}`;
const testNameKey = testName.toLocaleLowerCase("pl");
const result = {};

try {
  const maciej = await request("GET", "Maciej");
  if (maciej.payload.cards.length !== 4937) throw new Error("Profil Maciej nie otrzymał 4937 kart.");
  result.existingProfile = {
    cards: maciej.payload.cards.length,
    progress: maciej.payload.progress.length,
    progressChecksum: createHash("sha256")
      .update(JSON.stringify(maciej.payload.progress))
      .digest("hex"),
    hasActiveSession: Boolean(maciej.payload.meta?.activeSession),
  };

  const initial = await request("GET", testName);
  const device = initial.payload.device;
  if (!device?.id || !device?.token) throw new Error("Nie utworzono tożsamości profilu testowego.");
  const cardId = initial.payload.cards[0].id;
  const reviewedAt = "2026-07-27T17:30:00.000Z";
  const dueAt = "2026-07-28T17:30:00.000Z";
  const progress = {
    id: cardId,
    repetitions: 1,
    intervalDays: 1,
    ease: 2.5,
    dueAt,
    learned: false,
    lapses: 0,
    stage: "learning",
    correctStreak: 1,
    successfulModes: ["choice-de-pl"],
    firstActiveRecallAt: reviewedAt,
    lastActiveRecallAt: reviewedAt,
    lastReviewedAt: reviewedAt,
    typedAttempts: 0,
    typedSuccesses: 0,
    leitnerBox: 1,
    reviewHistory: [{
      id: `smoke-${cardId}`,
      reviewedAt,
      mode: "choice-de-pl",
      rating: "good",
      correct: true,
      score: 100,
      fromBox: 1,
      toBox: 1,
      scheduledFor: dueAt,
      reason: "Test integracyjny.",
    }],
    lastSchedulingReason: "Test integracyjny.",
    successfulReviewDays: ["2026-07-27"],
  };
  const meta = {
    streak: 1,
    lastStudyDate: "2026-07-27",
    completedToday: 1,
    totalReviews: 1,
    theme: "system",
    contentVersion: 7,
    activeSession: {
      version: 2,
      mode: "learn",
      categoryId: null,
      queue: [],
      index: 0,
      startedAt: reviewedAt,
      correct: 0,
      mistakes: 0,
      introduced: 0,
      pendingAnswer: null,
    },
    activeChallenge: { version: 1, index: 2 },
  };

  await request("PUT", testName, { progress: [progress], meta }, device);
  const secondDevice = await request("GET", testName);
  if (secondDevice.payload.progress.length !== 1) throw new Error("Drugi odczyt nie zwrócił postępu.");
  if (secondDevice.payload.progress[0].reviewHistory.length !== 1) {
    throw new Error("Historia nie została odtworzona.");
  }
  if (secondDevice.payload.meta.activeChallenge?.index !== 2) {
    throw new Error("Elastyczne metadane profilu zostały utracone.");
  }

  const updated = {
    ...progress,
    repetitions: 2,
    intervalDays: 3,
    leitnerBox: 2,
    stage: "known",
  };
  await request("PUT", testName, { progress: [updated], meta }, device);
  const reloaded = await request("GET", testName, undefined, device);
  if (reloaded.payload.progress[0].leitnerBox !== 2) {
    throw new Error("Aktualizacja pojedynczej karty nie została zachowana.");
  }

  const parity = (await sql.query(`
    SELECT
      COUNT(*) FILTER (
        WHERE data->>'stage' IS DISTINCT FROM stage
           OR (data->>'leitnerBox')::smallint IS DISTINCT FROM leitner_box
           OR jsonb_array_length(data->'reviewHistory') IS DISTINCT FROM (
             SELECT COUNT(*)::integer
             FROM card_review_history history
             WHERE history.profile_id = progress.profile_id
               AND history.card_id = progress.card_id
           )
      ) AS mismatches
    FROM card_progress progress
    JOIN learning_profiles profile ON profile.id = progress.profile_id
    WHERE profile.name_key = $1
  `, [testNameKey]))[0];
  if (Number(parity.mismatches) !== 0) throw new Error("Dual-write testowego profilu jest niespójny.");

  result.temporaryProfile = {
    created: true,
    twoDeviceSync: true,
    progressRows: reloaded.payload.progress.length,
    historyRows: reloaded.payload.progress[0].reviewHistory.length,
    singleCardUpdate: true,
    activeSessionPreserved: Boolean(reloaded.payload.meta.activeSession),
    activeChallengePreserved: Boolean(reloaded.payload.meta.activeChallenge),
    dualWriteMismatches: Number(parity.mismatches),
  };
} finally {
  await sql.query("DELETE FROM learning_profiles WHERE name_key = $1", [testNameKey]);
}

console.log(JSON.stringify(result, null, 2));
