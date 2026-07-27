import { createHash, randomBytes, randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";

const progressKeys = [
  "repetitions",
  "intervalDays",
  "ease",
  "dueAt",
  "learned",
  "lapses",
  "stage",
  "correctStreak",
  "successfulModes",
  "firstActiveRecallAt",
  "lastActiveRecallAt",
  "lastReviewedAt",
  "typedAttempts",
  "typedSuccesses",
  "leitnerBox",
  "reviewHistory",
  "lastSchedulingReason",
  "successfulReviewDays",
];
let schemaReady;

function database() {
  if (!process.env.DATABASE_URL) throw new Error("Brakuje konfiguracji bazy danych.");
  return neon(process.env.DATABASE_URL);
}

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function normalizeProfileName(value) {
  const normalized = value.normalize("NFKC").trim().replace(/\s+/g, " ");
  if (
    normalized.length < 2 ||
    normalized.length > 30 ||
    !/^[\p{L}][\p{L}\p{M} '-]*$/u.test(normalized)
  ) {
    return null;
  }
  return {
    displayName: normalized,
    nameKey: normalized.toLocaleLowerCase("pl"),
  };
}

function profileNameForRequest(req) {
  const header = req.headers["x-learning-profile-name"];
  if (typeof header !== "string" || !header) return null;
  try {
    return normalizeProfileName(decodeURIComponent(header));
  } catch {
    return null;
  }
}

async function ensureSchema(sql) {
  if (!schemaReady) {
    schemaReady = (async () => {
      await sql`CREATE TABLE IF NOT EXISTS catalog_cards (
        id TEXT PRIMARY KEY,
        position INTEGER NOT NULL UNIQUE,
        content JSONB NOT NULL
      )`;
      await sql`CREATE TABLE IF NOT EXISTS learning_profiles (
        id UUID PRIMARY KEY,
        token_hash TEXT NOT NULL,
        meta JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;
      await sql`ALTER TABLE learning_profiles ADD COLUMN IF NOT EXISTS display_name TEXT`;
      await sql`ALTER TABLE learning_profiles ADD COLUMN IF NOT EXISTS name_key TEXT`;
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS learning_profiles_name_key_unique
        ON learning_profiles (name_key) WHERE name_key IS NOT NULL`;
      await sql`CREATE TABLE IF NOT EXISTS card_progress (
        profile_id UUID NOT NULL REFERENCES learning_profiles(id) ON DELETE CASCADE,
        card_id TEXT NOT NULL REFERENCES catalog_cards(id) ON DELETE CASCADE,
        data JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (profile_id, card_id)
      )`;
    })();
  }
  return schemaReady;
}

function readBody(req) {
  if (!req.body) return {};
  return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
}

function progressPayload(cards) {
  if (!Array.isArray(cards)) return [];
  return cards
    .filter((card) => card && typeof card.id === "string")
    .slice(0, 3038)
    .map((card) => Object.fromEntries(["id", ...progressKeys].map((key) => [key, card[key]])));
}

async function deviceProfileForRequest(req, sql) {
  const id = req.headers["x-learning-device-id"];
  const token = req.headers["x-learning-device-token"];
  if (typeof id === "string" && typeof token === "string") {
    const rows = await sql.query("SELECT token_hash, meta FROM learning_profiles WHERE id = $1", [id]);
    if (rows.length) {
      if (rows[0].token_hash !== hashToken(token)) return { denied: true };
      return { id, token, meta: rows[0].meta ?? {}, created: false, authenticated: true };
    }
  }

  const newId = randomUUID();
  const newToken = randomBytes(32).toString("base64url");
  await sql.query("INSERT INTO learning_profiles (id, token_hash) VALUES ($1::uuid, $2)", [newId, hashToken(newToken)]);
  return { id: newId, token: newToken, meta: {}, created: true };
}

async function profileForRequest(req, sql) {
  const requestedName = profileNameForRequest(req);
  if (!requestedName) return deviceProfileForRequest(req, sql);

  const namedRows = await sql.query(
    "SELECT id, meta, display_name FROM learning_profiles WHERE name_key = $1",
    [requestedName.nameKey],
  );
  if (namedRows.length) {
    return {
      id: namedRows[0].id,
      meta: namedRows[0].meta ?? {},
      displayName: namedRows[0].display_name,
      created: false,
    };
  }

  const deviceId = req.headers["x-learning-device-id"];
  const deviceToken = req.headers["x-learning-device-token"];
  if (typeof deviceId === "string" && typeof deviceToken === "string") {
    const deviceRows = await sql.query(
      "SELECT token_hash, meta, name_key FROM learning_profiles WHERE id = $1::uuid",
      [deviceId],
    );
    if (
      deviceRows.length &&
      deviceRows[0].token_hash === hashToken(deviceToken) &&
      !deviceRows[0].name_key
    ) {
      const claimed = await sql.query(
        `UPDATE learning_profiles
         SET display_name = $2, name_key = $3, updated_at = NOW()
         WHERE id = $1::uuid AND name_key IS NULL
         RETURNING id, meta, display_name`,
        [deviceId, requestedName.displayName, requestedName.nameKey],
      );
      if (claimed.length) {
        return {
          id: claimed[0].id,
          token: deviceToken,
          meta: claimed[0].meta ?? {},
          displayName: claimed[0].display_name,
          created: false,
        };
      }
    }
  }

  const newId = randomUUID();
  const newToken = randomBytes(32).toString("base64url");
  await sql.query(
    `INSERT INTO learning_profiles (id, token_hash, display_name, name_key)
     VALUES ($1::uuid, $2, $3, $4)
     ON CONFLICT (name_key) WHERE name_key IS NOT NULL DO NOTHING`,
    [newId, hashToken(newToken), requestedName.displayName, requestedName.nameKey],
  );
  const createdRows = await sql.query(
    "SELECT id, meta, display_name FROM learning_profiles WHERE name_key = $1",
    [requestedName.nameKey],
  );
  return {
    id: createdRows[0].id,
    token: createdRows[0].id === newId ? newToken : undefined,
    meta: createdRows[0].meta ?? {},
    displayName: createdRows[0].display_name,
    created: createdRows[0].id === newId,
  };
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") return res.status(204).end();

  try {
    const sql = database();
    await ensureSchema(sql);
    const profile = await profileForRequest(req, sql);
    if (profile.denied) return res.status(401).json({ error: "Nieprawidłowy identyfikator urządzenia." });

    if (req.method === "GET") {
      const [cards, progress] = await Promise.all([
        sql.query("SELECT content FROM catalog_cards ORDER BY position"),
        sql.query("SELECT card_id, data FROM card_progress WHERE profile_id = $1::uuid", [profile.id]),
      ]);
      if (!cards.length) return res.status(503).json({ error: "Katalog kart jest jeszcze przygotowywany." });
      return res.status(200).json({
        device: profile.created ? { id: profile.id, token: profile.token } : undefined,
        profile: profile.displayName ? { name: profile.displayName } : undefined,
        cards: cards.map((row) => row.content),
        progress: progress.map((row) => ({ id: row.card_id, ...row.data })),
        meta: profile.meta,
      });
    }

    if (req.method === "PUT") {
      const body = readBody(req);
      const progress = progressPayload(body.progress);
      const meta = body.meta && typeof body.meta === "object" ? body.meta : {};
      await sql.query(
        `WITH entries AS (
           SELECT entry FROM jsonb_array_elements($2::jsonb) AS entry
         ),
         removed AS (
           DELETE FROM card_progress AS saved
           WHERE saved.profile_id = $1::uuid
             AND NOT EXISTS (
               SELECT 1 FROM entries WHERE entries.entry->>'id' = saved.card_id
             )
         )
         INSERT INTO card_progress (profile_id, card_id, data)
         SELECT $1::uuid, entry->>'id', entry - 'id'
         FROM entries
         ON CONFLICT (profile_id, card_id)
         DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
        [profile.id, JSON.stringify(progress)],
      );
      await sql.query("UPDATE learning_profiles SET meta = $2::jsonb, updated_at = NOW() WHERE id = $1::uuid", [profile.id, JSON.stringify(meta)]);
      return res.status(204).end();
    }

    return res.status(405).json({ error: "Metoda niedozwolona." });
  } catch (error) {
    console.error("learning-api", error);
    return res.status(500).json({ error: "Nie udało się połączyć z bazą." });
  }
}
