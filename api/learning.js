import { createHash, randomBytes, randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { mapCatalogRow, mapProfileMeta, mapProgressRows } from "./learning-mappers.js";

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
  "challengeStats",
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
      await sql`ALTER TABLE catalog_cards ADD COLUMN IF NOT EXISTS curriculum_tier TEXT`;
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
    const rows = await sql.query(
      `SELECT token_hash, meta, streak, last_study_date, completed_today,
              total_reviews, theme, content_version, active_session
       FROM learning_profiles WHERE id = $1`,
      [id],
    );
    if (rows.length) {
      if (rows[0].token_hash !== hashToken(token)) return { denied: true };
      return { id, token, meta: mapProfileMeta(rows[0]), created: false, authenticated: true };
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
    `SELECT id, meta, display_name, streak, last_study_date, completed_today,
            total_reviews, theme, content_version, active_session
     FROM learning_profiles WHERE name_key = $1`,
    [requestedName.nameKey],
  );
  if (namedRows.length) {
    return {
      id: namedRows[0].id,
      meta: mapProfileMeta(namedRows[0]),
      displayName: namedRows[0].display_name,
      created: false,
    };
  }

  const deviceId = req.headers["x-learning-device-id"];
  const deviceToken = req.headers["x-learning-device-token"];
  if (typeof deviceId === "string" && typeof deviceToken === "string") {
    const deviceRows = await sql.query(
      `SELECT token_hash, meta, name_key, streak, last_study_date, completed_today,
              total_reviews, theme, content_version, active_session
       FROM learning_profiles WHERE id = $1::uuid`,
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
         RETURNING id, meta, display_name, streak, last_study_date, completed_today,
                   total_reviews, theme, content_version, active_session`,
        [deviceId, requestedName.displayName, requestedName.nameKey],
      );
      if (claimed.length) {
        return {
          id: claimed[0].id,
          token: deviceToken,
          meta: mapProfileMeta(claimed[0]),
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
    `SELECT id, meta, display_name, streak, last_study_date, completed_today,
            total_reviews, theme, content_version, active_session
     FROM learning_profiles WHERE name_key = $1`,
    [requestedName.nameKey],
  );
  return {
    id: createdRows[0].id,
    token: createdRows[0].id === newId ? newToken : undefined,
    meta: mapProfileMeta(createdRows[0]),
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
      const [cards, categories, progress, history] = await Promise.all([
        sql.query(`
          SELECT
            card.id, card.german, card.polish, card.article, card.plural,
            card.example_german, card.example_polish, card.category_id, card.curriculum_tier, card.level,
            card.source_label, card.source_url, card.source_gloss, card.source_language
          FROM catalog_cards card
          ORDER BY card.position
        `),
        sql.query("SELECT id, display_name FROM categories"),
        sql.query(`
          SELECT
            card_id, data, repetitions, interval_days, ease, due_at, learned,
            lapses, stage, correct_streak, successful_modes, first_active_recall_at,
            last_active_recall_at, last_reviewed_at, typed_attempts, typed_successes,
            leitner_box, last_scheduling_reason, successful_review_days
          FROM card_progress
          WHERE profile_id = $1::uuid
        `, [profile.id]),
        sql.query(`
          SELECT
            card_id, event_id, reviewed_at, mode, rating, correct, score,
            from_box, to_box, scheduled_for, reason
          FROM card_review_history
          WHERE profile_id = $1::uuid
          ORDER BY card_id, sequence_no
        `, [profile.id]),
      ]);
      if (!cards.length) return res.status(503).json({ error: "Katalog kart jest jeszcze przygotowywany." });
      const categoryById = new Map(categories.map((row) => [row.id, row.display_name]));
      return res.status(200).json({
        device: profile.created ? { id: profile.id, token: profile.token } : undefined,
        profile: profile.displayName
          ? { name: profile.displayName, created: profile.created }
          : undefined,
        cards: cards.map((row) => mapCatalogRow({
          ...row,
          category: categoryById.get(row.category_id),
        })),
        progress: mapProgressRows(progress, history),
        meta: profile.meta,
      });
    }

    if (req.method === "PUT") {
      const body = readBody(req);
      const progress = progressPayload(body.progress);
      const meta = body.meta && typeof body.meta === "object" ? body.meta : {};
      await sql.transaction((txn) => [
        txn.query(
          "DELETE FROM card_review_history WHERE profile_id = $1::uuid",
          [profile.id],
        ),
        txn.query(
        `WITH entries AS (
           SELECT entry FROM jsonb_array_elements($2::jsonb) AS entry
         ),
         removed AS (
           DELETE FROM card_progress AS saved
           WHERE saved.profile_id = $1::uuid
             AND NOT EXISTS (
               SELECT 1 FROM entries WHERE entries.entry->>'id' = saved.card_id
             )
           RETURNING 1
         )
         INSERT INTO card_progress (
           profile_id, card_id, data, repetitions, interval_days, ease, due_at,
           learned, lapses, stage, correct_streak, successful_modes,
           first_active_recall_at, last_active_recall_at, last_reviewed_at,
           typed_attempts, typed_successes, leitner_box, last_scheduling_reason,
           successful_review_days
         )
         SELECT
           $1::uuid,
           entry->>'id',
           entry - 'id',
           (entry->>'repetitions')::integer,
           (entry->>'intervalDays')::integer,
           (entry->>'ease')::numeric,
           (entry->>'dueAt')::timestamptz,
           (entry->>'learned')::boolean,
           (entry->>'lapses')::integer,
           entry->>'stage',
           (entry->>'correctStreak')::integer,
           ARRAY(SELECT jsonb_array_elements_text(entry->'successfulModes')),
           NULLIF(entry->>'firstActiveRecallAt', '')::timestamptz,
           NULLIF(entry->>'lastActiveRecallAt', '')::timestamptz,
           NULLIF(entry->>'lastReviewedAt', '')::timestamptz,
           (entry->>'typedAttempts')::integer,
           (entry->>'typedSuccesses')::integer,
           (entry->>'leitnerBox')::smallint,
           entry->>'lastSchedulingReason',
           ARRAY(
             SELECT value::date
             FROM jsonb_array_elements_text(entry->'successfulReviewDays') value
           )
         FROM entries
         ON CONFLICT (profile_id, card_id)
         DO UPDATE SET
           data = EXCLUDED.data,
           repetitions = EXCLUDED.repetitions,
           interval_days = EXCLUDED.interval_days,
           ease = EXCLUDED.ease,
           due_at = EXCLUDED.due_at,
           learned = EXCLUDED.learned,
           lapses = EXCLUDED.lapses,
           stage = EXCLUDED.stage,
           correct_streak = EXCLUDED.correct_streak,
           successful_modes = EXCLUDED.successful_modes,
           first_active_recall_at = EXCLUDED.first_active_recall_at,
           last_active_recall_at = EXCLUDED.last_active_recall_at,
           last_reviewed_at = EXCLUDED.last_reviewed_at,
           typed_attempts = EXCLUDED.typed_attempts,
           typed_successes = EXCLUDED.typed_successes,
           leitner_box = EXCLUDED.leitner_box,
           last_scheduling_reason = EXCLUDED.last_scheduling_reason,
           successful_review_days = EXCLUDED.successful_review_days,
           updated_at = NOW()`,
        [profile.id, JSON.stringify(progress)],
        ),
        txn.query(
          `WITH entries AS (
             SELECT entry FROM jsonb_array_elements($2::jsonb) AS entry
           )
           INSERT INTO card_review_history (
             profile_id, card_id, event_id, sequence_no, reviewed_at, mode, rating,
             correct, score, from_box, to_box, scheduled_for, reason
           )
           SELECT
             $1::uuid,
             entry->>'id',
             event->>'id',
             history.ordinality::integer,
             (event->>'reviewedAt')::timestamptz,
             event->>'mode',
             event->>'rating',
             (event->>'correct')::boolean,
             NULLIF(event->>'score', '')::numeric,
             (event->>'fromBox')::smallint,
             (event->>'toBox')::smallint,
             (event->>'scheduledFor')::timestamptz,
             event->>'reason'
           FROM entries
           CROSS JOIN LATERAL jsonb_array_elements(entries.entry->'reviewHistory')
             WITH ORDINALITY AS history(event, ordinality)`,
          [profile.id, JSON.stringify(progress)],
        ),
        txn.query(
          `UPDATE learning_profiles
           SET
             meta = $2::jsonb,
             streak = CASE WHEN $2::jsonb ? 'streak'
               THEN ($2::jsonb->>'streak')::integer ELSE NULL END,
             last_study_date = CASE
               WHEN $2::jsonb->>'lastStudyDate' ~ '^\\d{4}-\\d{2}-\\d{2}$'
               THEN ($2::jsonb->>'lastStudyDate')::date ELSE NULL END,
             completed_today = CASE WHEN $2::jsonb ? 'completedToday'
               THEN ($2::jsonb->>'completedToday')::integer ELSE NULL END,
             total_reviews = CASE WHEN $2::jsonb ? 'totalReviews'
               THEN ($2::jsonb->>'totalReviews')::integer ELSE NULL END,
             theme = $2::jsonb->>'theme',
             content_version = CASE WHEN $2::jsonb ? 'contentVersion'
               THEN ($2::jsonb->>'contentVersion')::integer ELSE NULL END,
             active_session = CASE WHEN $2::jsonb ? 'activeSession'
               THEN $2::jsonb->'activeSession' ELSE NULL END,
             updated_at = NOW()
           WHERE id = $1::uuid`,
          [profile.id, JSON.stringify(meta)],
        ),
      ]);
      return res.status(204).end();
    }

    return res.status(405).json({ error: "Metoda niedozwolona." });
  } catch (error) {
    console.error("learning-api", error);
    return res.status(500).json({ error: "Nie udało się połączyć z bazą." });
  }
}
