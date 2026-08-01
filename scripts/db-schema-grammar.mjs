export const MIGRATION_ID = "20260801_005_grammar_a1_b1";

export const migrationStatements = [
  `CREATE TABLE IF NOT EXISTS schema_migrations (
    id TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    validation JSONB NOT NULL DEFAULT '{}'::jsonb
  )`,
  `CREATE TABLE IF NOT EXISTS grammar_topics (
    id TEXT PRIMARY KEY,
    level TEXT NOT NULL CHECK (level IN ('A1', 'A2', 'B1')),
    sort_order INTEGER NOT NULL UNIQUE,
    title_pl TEXT NOT NULL,
    title_de TEXT NOT NULL,
    published BOOLEAN NOT NULL DEFAULT FALSE,
    content_version INTEGER NOT NULL DEFAULT 1,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS grammar_topic_prerequisites (
    topic_id TEXT NOT NULL REFERENCES grammar_topics(id) ON DELETE CASCADE,
    prerequisite_topic_id TEXT NOT NULL REFERENCES grammar_topics(id) ON DELETE CASCADE,
    PRIMARY KEY (topic_id, prerequisite_topic_id),
    CHECK (topic_id <> prerequisite_topic_id)
  )`,
  `CREATE TABLE IF NOT EXISTS grammar_examples (
    id BIGSERIAL PRIMARY KEY,
    topic_id TEXT NOT NULL REFERENCES grammar_topics(id) ON DELETE CASCADE,
    position SMALLINT NOT NULL,
    german TEXT NOT NULL,
    polish TEXT NOT NULL,
    highlight TEXT,
    UNIQUE (topic_id, position)
  )`,
  `CREATE TABLE IF NOT EXISTS grammar_exercises (
    id TEXT PRIMARY KEY,
    topic_id TEXT NOT NULL REFERENCES grammar_topics(id) ON DELETE CASCADE,
    position SMALLINT NOT NULL,
    exercise_type TEXT NOT NULL,
    target_skill TEXT NOT NULL,
    content JSONB NOT NULL,
    UNIQUE (topic_id, position)
  )`,
  `CREATE TABLE IF NOT EXISTS grammar_exercise_options (
    exercise_id TEXT NOT NULL REFERENCES grammar_exercises(id) ON DELETE CASCADE,
    option_id TEXT NOT NULL,
    position SMALLINT NOT NULL,
    text TEXT NOT NULL,
    PRIMARY KEY (exercise_id, option_id)
  )`,
  `CREATE TABLE IF NOT EXISTS grammar_topic_progress (
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
  )`,
  `CREATE TABLE IF NOT EXISTS grammar_attempts (
    id UUID PRIMARY KEY,
    profile_id UUID NOT NULL REFERENCES learning_profiles(id) ON DELETE CASCADE,
    topic_id TEXT NOT NULL REFERENCES grammar_topics(id) ON DELETE CASCADE,
    exercise_id TEXT NOT NULL REFERENCES grammar_exercises(id) ON DELETE CASCADE,
    correct BOOLEAN NOT NULL,
    score NUMERIC(4,3) NOT NULL,
    answered_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS grammar_topic_progress_due_idx
    ON grammar_topic_progress (profile_id, next_review_at)`,
  `CREATE INDEX IF NOT EXISTS grammar_attempts_profile_topic_idx
    ON grammar_attempts (profile_id, topic_id, answered_at DESC)`,
];

export const validationQuery = `
  SELECT
    (SELECT COUNT(*) FROM grammar_topics) AS grammar_topics,
    (SELECT COUNT(*) FROM grammar_topics WHERE published) AS published_topics,
    (SELECT COUNT(*) FROM grammar_topic_progress progress
      LEFT JOIN grammar_topics topic ON topic.id = progress.topic_id
      WHERE topic.id IS NULL) AS orphan_grammar_progress,
    (SELECT COUNT(*) FROM grammar_topic_progress
      WHERE mastery_score NOT BETWEEN 0 AND 100 OR review_step NOT BETWEEN 0 AND 6) AS invalid_grammar_progress
`;

export function validationPassed(row) {
  return Number(row.grammar_topics) >= 12 &&
    Number(row.published_topics) >= 12 &&
    Number(row.orphan_grammar_progress) === 0 &&
    Number(row.invalid_grammar_progress) === 0;
}
