export const MIGRATION_ID = "20260727_001_normalize_learning_data";

export const legacySchemaStatements = [
  `CREATE TABLE catalog_cards (
    id TEXT PRIMARY KEY,
    position INTEGER NOT NULL UNIQUE,
    content JSONB NOT NULL
  )`,
  `CREATE TABLE learning_profiles (
    id UUID PRIMARY KEY,
    token_hash TEXT NOT NULL,
    meta JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    display_name TEXT,
    name_key TEXT
  )`,
  `CREATE UNIQUE INDEX learning_profiles_name_key_unique
    ON learning_profiles (name_key) WHERE name_key IS NOT NULL`,
  `CREATE TABLE card_progress (
    profile_id UUID NOT NULL REFERENCES learning_profiles(id) ON DELETE CASCADE,
    card_id TEXT NOT NULL REFERENCES catalog_cards(id) ON DELETE CASCADE,
    data JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (profile_id, card_id)
  )`,
];

export const expandStatements = [
  `CREATE TABLE IF NOT EXISTS schema_migrations (
    id TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    validation JSONB NOT NULL DEFAULT '{}'::jsonb
  )`,
  `CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL UNIQUE,
    name_pl TEXT NOT NULL,
    name_de TEXT NOT NULL,
    sort_order INTEGER NOT NULL UNIQUE
  )`,
  `ALTER TABLE catalog_cards
    ADD COLUMN IF NOT EXISTS german TEXT,
    ADD COLUMN IF NOT EXISTS polish TEXT,
    ADD COLUMN IF NOT EXISTS article TEXT,
    ADD COLUMN IF NOT EXISTS plural TEXT,
    ADD COLUMN IF NOT EXISTS example_german TEXT,
    ADD COLUMN IF NOT EXISTS example_polish TEXT,
    ADD COLUMN IF NOT EXISTS category_id TEXT,
    ADD COLUMN IF NOT EXISTS curriculum_tier TEXT,
    ADD COLUMN IF NOT EXISTS level TEXT,
    ADD COLUMN IF NOT EXISTS source_label TEXT,
    ADD COLUMN IF NOT EXISTS source_url TEXT,
    ADD COLUMN IF NOT EXISTS source_gloss TEXT,
    ADD COLUMN IF NOT EXISTS source_language TEXT`,
  `ALTER TABLE learning_profiles
    ADD COLUMN IF NOT EXISTS streak INTEGER,
    ADD COLUMN IF NOT EXISTS last_study_date DATE,
    ADD COLUMN IF NOT EXISTS completed_today INTEGER,
    ADD COLUMN IF NOT EXISTS total_reviews INTEGER,
    ADD COLUMN IF NOT EXISTS theme TEXT,
    ADD COLUMN IF NOT EXISTS content_version INTEGER,
    ADD COLUMN IF NOT EXISTS active_session JSONB`,
  `ALTER TABLE card_progress
    ADD COLUMN IF NOT EXISTS repetitions INTEGER,
    ADD COLUMN IF NOT EXISTS interval_days INTEGER,
    ADD COLUMN IF NOT EXISTS ease NUMERIC(4, 2),
    ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS learned BOOLEAN,
    ADD COLUMN IF NOT EXISTS lapses INTEGER,
    ADD COLUMN IF NOT EXISTS stage TEXT,
    ADD COLUMN IF NOT EXISTS correct_streak INTEGER,
    ADD COLUMN IF NOT EXISTS successful_modes TEXT[],
    ADD COLUMN IF NOT EXISTS first_active_recall_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_active_recall_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_reviewed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS typed_attempts INTEGER,
    ADD COLUMN IF NOT EXISTS typed_successes INTEGER,
    ADD COLUMN IF NOT EXISTS leitner_box SMALLINT,
    ADD COLUMN IF NOT EXISTS last_scheduling_reason TEXT,
    ADD COLUMN IF NOT EXISTS successful_review_days DATE[]`,
  `CREATE TABLE IF NOT EXISTS card_review_history (
    profile_id UUID NOT NULL,
    card_id TEXT NOT NULL,
    event_id TEXT NOT NULL,
    sequence_no INTEGER NOT NULL,
    reviewed_at TIMESTAMPTZ NOT NULL,
    mode TEXT NOT NULL,
    rating TEXT NOT NULL,
    correct BOOLEAN NOT NULL,
    score NUMERIC,
    from_box SMALLINT NOT NULL,
    to_box SMALLINT NOT NULL,
    scheduled_for TIMESTAMPTZ NOT NULL,
    reason TEXT NOT NULL,
    PRIMARY KEY (profile_id, card_id, event_id),
    UNIQUE (profile_id, card_id, sequence_no),
    FOREIGN KEY (profile_id, card_id)
      REFERENCES card_progress(profile_id, card_id) ON DELETE CASCADE
  )`,
];

export const backfillStatements = [
  `INSERT INTO categories (id, display_name, name_pl, name_de, sort_order)
   SELECT
     'category_' || substr(md5(category), 1, 12),
     category,
     trim(regexp_replace(category, '\\s*\\([^()]+\\)\\s*$', '')),
     COALESCE(substring(category FROM '\\(([^()]*)\\)\\s*$'), category),
     row_number() OVER (ORDER BY category)
   FROM (
     SELECT DISTINCT content->>'category' AS category
     FROM catalog_cards
   ) source
   WHERE category IS NOT NULL
   ON CONFLICT (id) DO UPDATE SET
     display_name = EXCLUDED.display_name,
     name_pl = EXCLUDED.name_pl,
     name_de = EXCLUDED.name_de,
     sort_order = EXCLUDED.sort_order`,
  `UPDATE catalog_cards
   SET
     german = content->>'german',
     polish = content->>'polish',
     article = content->>'article',
     plural = content->>'plural',
     example_german = content->>'exampleGerman',
     example_polish = content->>'examplePolish',
     category_id = 'category_' || substr(md5(content->>'category'), 1, 12),
     curriculum_tier = COALESCE(content->>'curriculumTier', 'core'),
     level = content->>'level',
     source_label = content->>'sourceLabel',
     source_url = content->>'sourceUrl',
     source_gloss = content->>'sourceGloss',
     source_language = content->>'sourceLanguage'`,
  `UPDATE learning_profiles
   SET
     streak = CASE WHEN meta ? 'streak' THEN (meta->>'streak')::integer ELSE NULL END,
     last_study_date = CASE
       WHEN meta->>'lastStudyDate' ~ '^\\d{4}-\\d{2}-\\d{2}$'
       THEN (meta->>'lastStudyDate')::date ELSE NULL END,
     completed_today = CASE WHEN meta ? 'completedToday' THEN (meta->>'completedToday')::integer ELSE NULL END,
     total_reviews = CASE WHEN meta ? 'totalReviews' THEN (meta->>'totalReviews')::integer ELSE NULL END,
     theme = meta->>'theme',
     content_version = CASE WHEN meta ? 'contentVersion' THEN (meta->>'contentVersion')::integer ELSE NULL END,
     active_session = CASE WHEN meta ? 'activeSession' THEN meta->'activeSession' ELSE NULL END`,
  `UPDATE card_progress
   SET
     repetitions = (data->>'repetitions')::integer,
     interval_days = (data->>'intervalDays')::integer,
     ease = (data->>'ease')::numeric,
     due_at = (data->>'dueAt')::timestamptz,
     learned = (data->>'learned')::boolean,
     lapses = (data->>'lapses')::integer,
     stage = data->>'stage',
     correct_streak = (data->>'correctStreak')::integer,
     successful_modes = ARRAY(
       SELECT jsonb_array_elements_text(data->'successfulModes')
     ),
     first_active_recall_at = NULLIF(data->>'firstActiveRecallAt', '')::timestamptz,
     last_active_recall_at = NULLIF(data->>'lastActiveRecallAt', '')::timestamptz,
     last_reviewed_at = NULLIF(data->>'lastReviewedAt', '')::timestamptz,
     typed_attempts = (data->>'typedAttempts')::integer,
     typed_successes = (data->>'typedSuccesses')::integer,
     leitner_box = (data->>'leitnerBox')::smallint,
     last_scheduling_reason = data->>'lastSchedulingReason',
     successful_review_days = ARRAY(
       SELECT value::date
       FROM jsonb_array_elements_text(data->'successfulReviewDays') value
     )`,
  `INSERT INTO card_review_history (
     profile_id, card_id, event_id, sequence_no, reviewed_at, mode, rating,
     correct, score, from_box, to_box, scheduled_for, reason
   )
   SELECT
     progress.profile_id,
     progress.card_id,
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
   FROM card_progress progress
   CROSS JOIN LATERAL jsonb_array_elements(progress.data->'reviewHistory')
     WITH ORDINALITY AS history(event, ordinality)
   ON CONFLICT (profile_id, card_id, event_id) DO UPDATE SET
     sequence_no = EXCLUDED.sequence_no,
     reviewed_at = EXCLUDED.reviewed_at,
     mode = EXCLUDED.mode,
     rating = EXCLUDED.rating,
     correct = EXCLUDED.correct,
     score = EXCLUDED.score,
     from_box = EXCLUDED.from_box,
     to_box = EXCLUDED.to_box,
     scheduled_for = EXCLUDED.scheduled_for,
     reason = EXCLUDED.reason`,
];

export const constraintStatements = [
  `CREATE INDEX IF NOT EXISTS catalog_cards_category_level_idx
    ON catalog_cards (category_id, level, position)`,
  `CREATE INDEX IF NOT EXISTS catalog_cards_curriculum_tier_idx
    ON catalog_cards (curriculum_tier, position)`,
  `CREATE INDEX IF NOT EXISTS card_progress_due_idx
    ON card_progress (profile_id, due_at)`,
  `CREATE INDEX IF NOT EXISTS card_progress_box_stage_idx
    ON card_progress (profile_id, leitner_box, stage)`,
  `CREATE INDEX IF NOT EXISTS card_review_history_profile_reviewed_idx
    ON card_review_history (profile_id, reviewed_at DESC)`,
  `CREATE INDEX IF NOT EXISTS card_review_history_mode_idx
    ON card_review_history (mode, correct)`,
  `DO $$
   BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'catalog_cards_category_fkey' AND conrelid = 'catalog_cards'::regclass) THEN
       ALTER TABLE catalog_cards
         ADD CONSTRAINT catalog_cards_category_fkey
         FOREIGN KEY (category_id) REFERENCES categories(id) NOT VALID;
     END IF;
     IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'catalog_cards_article_check' AND conrelid = 'catalog_cards'::regclass) THEN
       ALTER TABLE catalog_cards
         ADD CONSTRAINT catalog_cards_article_check
         CHECK (article IS NULL OR article IN ('der', 'die', 'das')) NOT VALID;
     END IF;
     IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'catalog_cards_level_check' AND conrelid = 'catalog_cards'::regclass) THEN
       ALTER TABLE catalog_cards
         ADD CONSTRAINT catalog_cards_level_check
         CHECK (level IN ('A2', 'B1')) NOT VALID;
     END IF;
     IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'catalog_cards_curriculum_tier_check' AND conrelid = 'catalog_cards'::regclass) THEN
       ALTER TABLE catalog_cards
         ADD CONSTRAINT catalog_cards_curriculum_tier_check
         CHECK (curriculum_tier IN ('core', 'extension', 'specialist')) NOT VALID;
     END IF;
     IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'card_progress_stage_check' AND conrelid = 'card_progress'::regclass) THEN
       ALTER TABLE card_progress
         ADD CONSTRAINT card_progress_stage_check
         CHECK (stage IN ('new', 'learning', 'uncertain', 'known', 'mastered')) NOT VALID;
     END IF;
     IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'card_progress_leitner_box_check' AND conrelid = 'card_progress'::regclass) THEN
       ALTER TABLE card_progress
         ADD CONSTRAINT card_progress_leitner_box_check
         CHECK (leitner_box BETWEEN 1 AND 5) NOT VALID;
     END IF;
     IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'learning_profiles_theme_check' AND conrelid = 'learning_profiles'::regclass) THEN
       ALTER TABLE learning_profiles
         ADD CONSTRAINT learning_profiles_theme_check
         CHECK (theme IS NULL OR theme IN ('system', 'light', 'dark')) NOT VALID;
     END IF;
     IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'card_review_history_mode_check' AND conrelid = 'card_review_history'::regclass) THEN
       ALTER TABLE card_review_history
         ADD CONSTRAINT card_review_history_mode_check
         CHECK (mode IN (
           'introduction', 'choice-de-pl', 'choice-pl-de', 'choice-article',
           'type-de-pl', 'type-pl-de', 'type-listen-de'
         )) NOT VALID;
     END IF;
     IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'card_review_history_rating_check' AND conrelid = 'card_review_history'::regclass) THEN
       ALTER TABLE card_review_history
         ADD CONSTRAINT card_review_history_rating_check
         CHECK (rating IN ('again', 'hard', 'good')) NOT VALID;
     END IF;
     IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'card_review_history_boxes_check' AND conrelid = 'card_review_history'::regclass) THEN
       ALTER TABLE card_review_history
         ADD CONSTRAINT card_review_history_boxes_check
         CHECK (from_box BETWEEN 1 AND 5 AND to_box BETWEEN 1 AND 5) NOT VALID;
     END IF;
   END $$`,
  `ALTER TABLE catalog_cards VALIDATE CONSTRAINT catalog_cards_category_fkey`,
  `ALTER TABLE catalog_cards VALIDATE CONSTRAINT catalog_cards_article_check`,
  `ALTER TABLE catalog_cards VALIDATE CONSTRAINT catalog_cards_level_check`,
  `ALTER TABLE catalog_cards VALIDATE CONSTRAINT catalog_cards_curriculum_tier_check`,
  `ALTER TABLE card_progress VALIDATE CONSTRAINT card_progress_stage_check`,
  `ALTER TABLE card_progress VALIDATE CONSTRAINT card_progress_leitner_box_check`,
  `ALTER TABLE learning_profiles VALIDATE CONSTRAINT learning_profiles_theme_check`,
  `ALTER TABLE card_review_history VALIDATE CONSTRAINT card_review_history_mode_check`,
  `ALTER TABLE card_review_history VALIDATE CONSTRAINT card_review_history_rating_check`,
  `ALTER TABLE card_review_history VALIDATE CONSTRAINT card_review_history_boxes_check`,
];

export const migrationStatements = [
  ...expandStatements,
  ...backfillStatements,
  ...constraintStatements,
];

export const validationQuery = `
  WITH reconstructed_history AS (
    SELECT
      profile_id,
      card_id,
      jsonb_agg(
        jsonb_build_object(
          'id', event_id,
          'reviewedAt', to_char(reviewed_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
          'mode', mode,
          'rating', rating,
          'correct', correct,
          'score', score,
          'fromBox', from_box,
          'toBox', to_box,
          'scheduledFor', to_char(scheduled_for AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
          'reason', reason
        )
        ORDER BY sequence_no
      ) AS history
    FROM card_review_history
    GROUP BY profile_id, card_id
  ),
  metrics AS (
    SELECT
      (SELECT COUNT(*) FROM catalog_cards) AS cards,
      (SELECT COUNT(*) FROM learning_profiles) AS profiles,
      (SELECT COUNT(*) FROM card_progress) AS progress_rows,
      (SELECT COUNT(*) FROM card_review_history) AS review_events,
      (SELECT COALESCE(SUM(cardinality(successful_modes)), 0) FROM card_progress) AS successful_mode_entries,
      (SELECT COALESCE(SUM(cardinality(successful_review_days)), 0) FROM card_progress) AS successful_review_days,
      (SELECT COUNT(*) FROM catalog_cards c
       WHERE c.content IS DISTINCT FROM jsonb_build_object(
         'id', c.id,
         'german', c.german,
         'polish', c.polish,
         'article', c.article,
         'plural', c.plural,
         'exampleGerman', c.example_german,
         'examplePolish', c.example_polish,
         'category', (SELECT category.display_name FROM categories category WHERE category.id = c.category_id),
         'level', c.level,
         'sourceLabel', c.source_label,
         'sourceUrl', c.source_url,
         'sourceGloss', c.source_gloss,
         'sourceLanguage', c.source_language
       ) || CASE
         WHEN c.content ? 'curriculumTier' THEN jsonb_build_object('curriculumTier', c.curriculum_tier)
         ELSE '{}'::jsonb
       END) AS catalog_mismatches,
      (SELECT COUNT(*) FROM card_progress p
       LEFT JOIN reconstructed_history h
         ON h.profile_id = p.profile_id AND h.card_id = p.card_id
       WHERE p.data IS DISTINCT FROM jsonb_build_object(
         'repetitions', p.repetitions,
         'intervalDays', p.interval_days,
         'ease', p.ease,
         'dueAt', to_char(p.due_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
         'learned', p.learned,
         'lapses', p.lapses,
         'stage', p.stage,
         'correctStreak', p.correct_streak,
         'successfulModes', to_jsonb(p.successful_modes),
         'firstActiveRecallAt', CASE WHEN p.first_active_recall_at IS NULL THEN NULL
           ELSE to_char(p.first_active_recall_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') END,
         'lastActiveRecallAt', CASE WHEN p.last_active_recall_at IS NULL THEN NULL
           ELSE to_char(p.last_active_recall_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') END,
         'lastReviewedAt', to_char(p.last_reviewed_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
         'typedAttempts', p.typed_attempts,
         'typedSuccesses', p.typed_successes,
         'leitnerBox', p.leitner_box,
         'reviewHistory', COALESCE(h.history, '[]'::jsonb),
         'lastSchedulingReason', p.last_scheduling_reason,
         'successfulReviewDays', to_jsonb(p.successful_review_days)
       ) || CASE
         WHEN p.data ? 'challengeStats' THEN jsonb_build_object('challengeStats', p.data->'challengeStats')
         ELSE '{}'::jsonb
       END) AS progress_mismatches,
      (SELECT COUNT(*) FROM learning_profiles p
       WHERE
         (p.meta ? 'streak' AND p.streak IS DISTINCT FROM (p.meta->>'streak')::integer)
         OR (p.meta ? 'lastStudyDate' AND p.last_study_date IS DISTINCT FROM CASE
           WHEN p.meta->>'lastStudyDate' ~ '^\\d{4}-\\d{2}-\\d{2}$'
           THEN (p.meta->>'lastStudyDate')::date ELSE NULL END)
         OR (p.meta ? 'completedToday' AND p.completed_today IS DISTINCT FROM (p.meta->>'completedToday')::integer)
         OR (p.meta ? 'totalReviews' AND p.total_reviews IS DISTINCT FROM (p.meta->>'totalReviews')::integer)
         OR (p.meta ? 'theme' AND p.theme IS DISTINCT FROM p.meta->>'theme')
         OR (p.meta ? 'contentVersion' AND p.content_version IS DISTINCT FROM (p.meta->>'contentVersion')::integer)
         OR (p.meta ? 'activeSession' AND p.active_session IS DISTINCT FROM p.meta->'activeSession')
      ) AS profile_meta_mismatches,
      (SELECT COUNT(*) FROM card_progress p
       LEFT JOIN catalog_cards c ON c.id = p.card_id
       WHERE c.id IS NULL) AS orphan_cards,
      (SELECT COUNT(*) FROM card_progress p
       LEFT JOIN learning_profiles lp ON lp.id = p.profile_id
       WHERE lp.id IS NULL) AS orphan_profiles,
      (SELECT COUNT(*) FROM catalog_cards WHERE category_id IS NULL) AS missing_categories,
      (SELECT COUNT(*) FROM card_progress
       WHERE leitner_box NOT BETWEEN 1 AND 5) AS invalid_boxes,
      (SELECT COUNT(*) FROM card_progress
       WHERE stage NOT IN ('new', 'learning', 'uncertain', 'known', 'mastered')) AS invalid_stages
  )
  SELECT *,
    md5(COALESCE((SELECT string_agg(id || ':' || position || ':' || content::text, '|' ORDER BY id)
      FROM catalog_cards), '')) AS catalog_legacy_checksum,
    md5(COALESCE((SELECT string_agg(id || ':' || COALESCE(name_key, '') || ':' || meta::text, '|' ORDER BY id)
      FROM learning_profiles), '')) AS profiles_legacy_checksum,
    md5(COALESCE((SELECT string_agg(profile_id || ':' || card_id || ':' || data::text, '|' ORDER BY profile_id, card_id)
      FROM card_progress), '')) AS progress_legacy_checksum
  FROM metrics
`;

export function validationPassed(row) {
  const exactMetrics = [
    "catalog_mismatches",
    "progress_mismatches",
    "profile_meta_mismatches",
    "orphan_cards",
    "orphan_profiles",
    "missing_categories",
    "invalid_boxes",
    "invalid_stages",
  ];
  return exactMetrics.every((key) => Number(row[key]) === 0);
}
