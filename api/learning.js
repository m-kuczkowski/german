import { createHash, randomBytes, randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { mapCatalogRow, mapProfileMeta, mapProgressRows } from "./learning-mappers.js";
import { grammarTopicSeed } from "./grammar-seed.js";

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
  "learningStats",
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
      await sql`ALTER TABLE catalog_cards ADD COLUMN IF NOT EXISTS word_family_id TEXT`;
      await sql`ALTER TABLE catalog_cards ADD COLUMN IF NOT EXISTS word_family_role TEXT`;
      await sql`ALTER TABLE catalog_cards ADD COLUMN IF NOT EXISTS prerequisite_ids TEXT[]`;
      await sql`ALTER TABLE catalog_cards ADD COLUMN IF NOT EXISTS word_parts JSONB`;
      await sql`ALTER TABLE catalog_cards ADD COLUMN IF NOT EXISTS curriculum_order INTEGER`;
      await sql`ALTER TABLE catalog_cards ADD COLUMN IF NOT EXISTS goethe_level TEXT`;
      await sql`ALTER TABLE catalog_cards ADD COLUMN IF NOT EXISTS goethe_source_url TEXT`;
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS learning_profiles_name_key_unique
        ON learning_profiles (name_key) WHERE name_key IS NOT NULL`;
      await sql`CREATE TABLE IF NOT EXISTS card_progress (
        profile_id UUID NOT NULL REFERENCES learning_profiles(id) ON DELETE CASCADE,
        card_id TEXT NOT NULL REFERENCES catalog_cards(id) ON DELETE CASCADE,
        data JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (profile_id, card_id)
      )`;
      await sql`ALTER TABLE card_progress ADD COLUMN IF NOT EXISTS learning_stats JSONB`;
      await sql`CREATE TABLE IF NOT EXISTS grammar_topics (
        id TEXT PRIMARY KEY,
        level TEXT NOT NULL CHECK (level IN ('A1', 'A2', 'B1')),
        sort_order INTEGER NOT NULL UNIQUE,
        title_pl TEXT NOT NULL,
        title_de TEXT NOT NULL,
        published BOOLEAN NOT NULL DEFAULT FALSE,
        content_version INTEGER NOT NULL DEFAULT 1,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;
      await sql`CREATE TABLE IF NOT EXISTS grammar_topic_prerequisites (
        topic_id TEXT NOT NULL REFERENCES grammar_topics(id) ON DELETE CASCADE,
        prerequisite_topic_id TEXT NOT NULL REFERENCES grammar_topics(id) ON DELETE CASCADE,
        PRIMARY KEY (topic_id, prerequisite_topic_id),
        CHECK (topic_id <> prerequisite_topic_id)
      )`;
      await sql`CREATE TABLE IF NOT EXISTS grammar_examples (
        id BIGSERIAL PRIMARY KEY,
        topic_id TEXT NOT NULL REFERENCES grammar_topics(id) ON DELETE CASCADE,
        position SMALLINT NOT NULL,
        german TEXT NOT NULL,
        polish TEXT NOT NULL,
        highlight TEXT,
        UNIQUE (topic_id, position)
      )`;
      await sql`CREATE TABLE IF NOT EXISTS grammar_exercises (
        id TEXT PRIMARY KEY,
        topic_id TEXT NOT NULL REFERENCES grammar_topics(id) ON DELETE CASCADE,
        position SMALLINT NOT NULL,
        exercise_type TEXT NOT NULL,
        target_skill TEXT NOT NULL,
        content JSONB NOT NULL,
        UNIQUE (topic_id, position)
      )`;
      await sql`CREATE TABLE IF NOT EXISTS grammar_exercise_options (
        exercise_id TEXT NOT NULL REFERENCES grammar_exercises(id) ON DELETE CASCADE,
        option_id TEXT NOT NULL,
        position SMALLINT NOT NULL,
        text TEXT NOT NULL,
        PRIMARY KEY (exercise_id, option_id)
      )`;
      await sql`CREATE TABLE IF NOT EXISTS grammar_topic_progress (
        profile_id UUID NOT NULL REFERENCES learning_profiles(id) ON DELETE CASCADE,
        topic_id TEXT NOT NULL REFERENCES grammar_topics(id) ON DELETE CASCADE,
        status TEXT NOT NULL CHECK (status IN ('new', 'learning', 'review', 'mastered')),
        mastery_score NUMERIC(5,2) NOT NULL DEFAULT 0,
        lesson_completions INTEGER NOT NULL DEFAULT 0,
        review_step SMALLINT NOT NULL DEFAULT 0,
        next_review_at TIMESTAMPTZ,
        first_started_at TIMESTAMPTZ,
        last_practiced_at TIMESTAMPTZ,
        mastered_at TIMESTAMPTZ,
        successful_review_dates DATE[] NOT NULL DEFAULT '{}',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (profile_id, topic_id)
      )`;
      await sql`CREATE TABLE IF NOT EXISTS grammar_attempts (
        id UUID PRIMARY KEY,
        profile_id UUID NOT NULL REFERENCES learning_profiles(id) ON DELETE CASCADE,
        topic_id TEXT NOT NULL REFERENCES grammar_topics(id) ON DELETE CASCADE,
        exercise_id TEXT NOT NULL REFERENCES grammar_exercises(id) ON DELETE CASCADE,
        correct BOOLEAN NOT NULL,
        score NUMERIC(4,3) NOT NULL,
        answered_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;
      await sql`CREATE INDEX IF NOT EXISTS grammar_topic_progress_due_idx
        ON grammar_topic_progress (profile_id, next_review_at)`;
      await sql`CREATE INDEX IF NOT EXISTS grammar_attempts_profile_topic_idx
        ON grammar_attempts (profile_id, topic_id, answered_at DESC)`;
      await sql`ALTER TABLE card_review_history
        DROP CONSTRAINT IF EXISTS card_review_history_mode_check`;
      await sql`ALTER TABLE card_review_history
        ADD CONSTRAINT card_review_history_mode_check
        CHECK (mode IN (
          'introduction', 'choice-de-pl', 'choice-pl-de', 'choice-article',
          'type-de-pl', 'type-pl-de', 'type-listen-de', 'type-context-de'
        )) NOT VALID`;
      await sql.query(
        `WITH topics AS (
           SELECT * FROM jsonb_to_recordset($1::jsonb)
           AS topic(id text, level text, "sortOrder" integer, "titlePl" text, "titleDe" text, published boolean)
         )
         INSERT INTO grammar_topics (id, level, sort_order, title_pl, title_de, published)
         SELECT id, level, "sortOrder", "titlePl", "titleDe", published FROM topics
         ON CONFLICT (id) DO UPDATE SET
           level = EXCLUDED.level,
           sort_order = EXCLUDED.sort_order,
           title_pl = EXCLUDED.title_pl,
           title_de = EXCLUDED.title_de,
           published = EXCLUDED.published,
           updated_at = NOW()`,
        [JSON.stringify(grammarTopicSeed)],
      );
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
    .slice(0, 10_000)
    .map((card) => Object.fromEntries(["id", ...progressKeys].map((key) => [key, card[key]])));
}

function grammarProgressPayload(progress) {
  if (!Array.isArray(progress)) return [];
  return progress
    .filter((item) => item && typeof item.topicId === "string")
    .filter((item) => grammarTopicSeed.some((topic) => topic.id === item.topicId))
    .slice(0, 100)
    .map((item) => ({
      topicId: item.topicId,
      status: ["new", "learning", "review", "mastered"].includes(item.status) ? item.status : "new",
      masteryScore: Number.isFinite(item.masteryScore) ? Math.max(0, Math.min(100, item.masteryScore)) : 0,
      lessonCompletions: Number.isInteger(item.lessonCompletions) ? Math.max(0, item.lessonCompletions) : 0,
      reviewStep: Number.isInteger(item.reviewStep) ? Math.max(0, Math.min(6, item.reviewStep)) : 0,
      nextReviewAt: typeof item.nextReviewAt === "string" ? item.nextReviewAt : null,
      firstStartedAt: typeof item.firstStartedAt === "string" ? item.firstStartedAt : null,
      lastPracticedAt: typeof item.lastPracticedAt === "string" ? item.lastPracticedAt : null,
      masteredAt: typeof item.masteredAt === "string" ? item.masteredAt : null,
      successfulReviewDates: Array.isArray(item.successfulReviewDates)
        ? item.successfulReviewDates.filter((date) => typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)).slice(-20)
        : [],
    }));
}

async function deviceProfileForRequest(req, sql) {
  const id = req.headers["x-learning-device-id"];
  const token = req.headers["x-learning-device-token"];
  if (typeof id === "string" && typeof token === "string") {
    const rows = await sql.query(
      `SELECT token_hash, meta, streak, last_study_date::text AS last_study_date, completed_today,
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
    `SELECT id, meta, display_name, streak, last_study_date::text AS last_study_date, completed_today,
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
      `SELECT token_hash, meta, name_key, streak, last_study_date::text AS last_study_date, completed_today,
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
         RETURNING id, meta, display_name, streak, last_study_date::text AS last_study_date, completed_today,
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
    `SELECT id, meta, display_name, streak, last_study_date::text AS last_study_date, completed_today,
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
      const [cards, categories, progress, history, grammarProgress] = await Promise.all([
        sql.query(`
          SELECT
            card.id, card.german, card.polish, card.article, card.plural,
            card.example_german, card.example_polish, card.category_id, card.curriculum_tier, card.level,
            card.word_family_id, card.word_family_role, card.prerequisite_ids, card.word_parts,
            card.curriculum_order, card.goethe_level, card.goethe_source_url,
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
            leitner_box, last_scheduling_reason, successful_review_days, learning_stats
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
        sql.query(`
          SELECT
            topic_id, status, mastery_score, lesson_completions, review_step,
            next_review_at, first_started_at, last_practiced_at, mastered_at,
            successful_review_dates
          FROM grammar_topic_progress
          WHERE profile_id = $1::uuid
          ORDER BY topic_id
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
        grammarProgress: grammarProgress.map((row) => ({
          topicId: row.topic_id,
          status: row.status,
          masteryScore: Number(row.mastery_score),
          lessonCompletions: row.lesson_completions,
          reviewStep: row.review_step,
          nextReviewAt: row.next_review_at ? new Date(row.next_review_at).toISOString() : null,
          firstStartedAt: row.first_started_at ? new Date(row.first_started_at).toISOString() : null,
          lastPracticedAt: row.last_practiced_at ? new Date(row.last_practiced_at).toISOString() : null,
          masteredAt: row.mastered_at ? new Date(row.mastered_at).toISOString() : null,
          successfulReviewDates: (row.successful_review_dates ?? []).map((date) => String(date).slice(0, 10)),
        })),
        meta: profile.meta,
      });
    }

    if (req.method === "PUT") {
      const body = readBody(req);
      const progress = progressPayload(body.progress);
      const grammarProgress = grammarProgressPayload(body.grammarProgress);
      const meta = body.meta && typeof body.meta === "object" ? body.meta : {};
      console.info("learning-api: sync-start", {
        profileId: profile.id,
        progressCards: progress.length,
        grammarTopics: grammarProgress.length,
      });
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
           successful_review_days, learning_stats
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
           ),
           COALESCE(entry->'learningStats', '{}'::jsonb)
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
           learning_stats = EXCLUDED.learning_stats,
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
          `WITH entries AS (
             SELECT * FROM jsonb_to_recordset($2::jsonb)
             AS entry(
               "topicId" text, status text, "masteryScore" numeric,
               "lessonCompletions" integer, "reviewStep" smallint,
               "nextReviewAt" timestamptz, "firstStartedAt" timestamptz,
               "lastPracticedAt" timestamptz, "masteredAt" timestamptz,
               "successfulReviewDates" text[]
             )
           )
           INSERT INTO grammar_topic_progress (
             profile_id, topic_id, status, mastery_score, lesson_completions,
             review_step, next_review_at, first_started_at, last_practiced_at,
             mastered_at, successful_review_dates
           )
           SELECT
             $1::uuid, "topicId", status, "masteryScore", "lessonCompletions",
             "reviewStep", "nextReviewAt", "firstStartedAt", "lastPracticedAt",
             "masteredAt", ARRAY(
               SELECT value::date FROM unnest(COALESCE("successfulReviewDates", ARRAY[]::text[])) value
             )
           FROM entries
           ON CONFLICT (profile_id, topic_id) DO UPDATE SET
             status = EXCLUDED.status,
             mastery_score = EXCLUDED.mastery_score,
             lesson_completions = EXCLUDED.lesson_completions,
             review_step = EXCLUDED.review_step,
             next_review_at = EXCLUDED.next_review_at,
             first_started_at = EXCLUDED.first_started_at,
             last_practiced_at = EXCLUDED.last_practiced_at,
             mastered_at = EXCLUDED.mastered_at,
             successful_review_dates = EXCLUDED.successful_review_dates,
             updated_at = NOW()`,
          [profile.id, JSON.stringify(grammarProgress)],
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
      console.info("learning-api: sync-complete", { profileId: profile.id });
      return res.status(204).end();
    }

    return res.status(405).json({ error: "Metoda niedozwolona." });
  } catch (error) {
    console.error("learning-api", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return res.status(500).json({ error: "Nie udało się połączyć z bazą." });
  }
}
