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

function normalize(value) {
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, normalize(item)]));
  }
  return value;
}

const databaseUrl =
  process.env.DATABASE_URL_UNPOOLED ||
  loadEnv("DATABASE_URL_UNPOOLED") ||
  process.env.DATABASE_URL ||
  loadEnv("DATABASE_URL");
if (!databaseUrl) throw new Error("Brakuje DATABASE_URL w pliku środowiskowym.");

const sql = neon(databaseUrl);
const report = {};

report.server = (await sql.query(`
  SELECT
    current_database() AS database_name,
    current_schema() AS schema_name,
    version() AS version
`))[0];

report.columns = await sql.query(`
  SELECT
    table_name,
    ordinal_position,
    column_name,
    data_type,
    udt_name,
    is_nullable,
    column_default
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name IN ('catalog_cards', 'learning_profiles', 'card_progress')
  ORDER BY table_name, ordinal_position
`);

report.constraints = await sql.query(`
  SELECT
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
  FROM information_schema.table_constraints tc
  LEFT JOIN information_schema.key_column_usage kcu
    ON tc.constraint_schema = kcu.constraint_schema
   AND tc.constraint_name = kcu.constraint_name
  LEFT JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_schema = ccu.constraint_schema
   AND tc.constraint_name = ccu.constraint_name
  WHERE tc.table_schema = 'public'
    AND tc.table_name IN ('catalog_cards', 'learning_profiles', 'card_progress')
  ORDER BY tc.table_name, tc.constraint_name, kcu.ordinal_position
`);

report.indexes = await sql.query(`
  SELECT tablename, indexname, indexdef
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename IN ('catalog_cards', 'learning_profiles', 'card_progress')
  ORDER BY tablename, indexname
`);

report.counts = (await sql.query(`
  SELECT
    (SELECT COUNT(*) FROM catalog_cards) AS cards,
    (SELECT COUNT(*) FROM learning_profiles) AS profiles,
    (SELECT COUNT(*) FROM card_progress) AS progress_rows,
    (SELECT COUNT(*) FROM learning_profiles WHERE name_key IS NOT NULL) AS named_profiles,
    (SELECT COUNT(*) FROM learning_profiles WHERE meta ? 'activeSession'
      AND jsonb_typeof(meta->'activeSession') = 'object') AS active_sessions,
    (SELECT COALESCE(SUM(jsonb_array_length(data->'reviewHistory')), 0)
      FROM card_progress
      WHERE jsonb_typeof(data->'reviewHistory') = 'array') AS review_events,
    (SELECT COALESCE(SUM(jsonb_array_length(data->'successfulModes')), 0)
      FROM card_progress
      WHERE jsonb_typeof(data->'successfulModes') = 'array') AS successful_mode_entries,
    (SELECT COALESCE(SUM(jsonb_array_length(data->'successfulReviewDays')), 0)
      FROM card_progress
      WHERE jsonb_typeof(data->'successfulReviewDays') = 'array') AS successful_review_days
`))[0];

report.tableSizes = await sql.query(`
  SELECT
    relname AS table_name,
    pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
    pg_total_relation_size(relid) AS total_bytes,
    pg_size_pretty(pg_relation_size(relid)) AS table_size,
    pg_size_pretty(pg_indexes_size(relid)) AS indexes_size
  FROM pg_catalog.pg_statio_user_tables
  WHERE schemaname = 'public'
    AND relname IN ('catalog_cards', 'learning_profiles', 'card_progress')
  ORDER BY relname
`);

report.jsonSizes = (await sql.query(`
  SELECT
    (SELECT ROUND(AVG(pg_column_size(content))) FROM catalog_cards) AS avg_card_content_bytes,
    (SELECT MAX(pg_column_size(content)) FROM catalog_cards) AS max_card_content_bytes,
    (SELECT ROUND(AVG(pg_column_size(meta))) FROM learning_profiles) AS avg_profile_meta_bytes,
    (SELECT MAX(pg_column_size(meta)) FROM learning_profiles) AS max_profile_meta_bytes,
    (SELECT ROUND(AVG(pg_column_size(data))) FROM card_progress) AS avg_progress_data_bytes,
    (SELECT MAX(pg_column_size(data)) FROM card_progress) AS max_progress_data_bytes
`))[0];

report.catalogKeyTypes = await sql.query(`
  SELECT key, jsonb_typeof(content->key) AS json_type, COUNT(*) AS rows
  FROM catalog_cards
  CROSS JOIN LATERAL jsonb_object_keys(content) AS key
  GROUP BY key, jsonb_typeof(content->key)
  ORDER BY key, json_type
`);

report.progressKeyTypes = await sql.query(`
  SELECT key, jsonb_typeof(data->key) AS json_type, COUNT(*) AS rows
  FROM card_progress
  CROSS JOIN LATERAL jsonb_object_keys(data) AS key
  GROUP BY key, jsonb_typeof(data->key)
  ORDER BY key, json_type
`);

report.metaKeyTypes = await sql.query(`
  SELECT key, jsonb_typeof(meta->key) AS json_type, COUNT(*) AS rows
  FROM learning_profiles
  CROSS JOIN LATERAL jsonb_object_keys(meta) AS key
  GROUP BY key, jsonb_typeof(meta->key)
  ORDER BY key, json_type
`);

report.valueDistributions = {
  catalog: await sql.query(`
    SELECT
      content->>'level' AS level,
      content->>'category' AS category,
      COUNT(*) AS rows
    FROM catalog_cards
    GROUP BY content->>'level', content->>'category'
    ORDER BY content->>'level', content->>'category'
  `),
  progressStage: await sql.query(`
    SELECT data->>'stage' AS stage, COUNT(*) AS rows
    FROM card_progress
    GROUP BY data->>'stage'
    ORDER BY stage
  `),
  leitnerBox: await sql.query(`
    SELECT data->>'leitnerBox' AS leitner_box, COUNT(*) AS rows
    FROM card_progress
    GROUP BY data->>'leitnerBox'
    ORDER BY leitner_box
  `),
  theme: await sql.query(`
    SELECT meta->>'theme' AS theme, COUNT(*) AS rows
    FROM learning_profiles
    GROUP BY meta->>'theme'
    ORDER BY theme
  `),
};

report.integrity = (await sql.query(`
  SELECT
    (SELECT COUNT(*)
       FROM card_progress p
       LEFT JOIN learning_profiles lp ON lp.id = p.profile_id
       WHERE lp.id IS NULL) AS orphan_profiles,
    (SELECT COUNT(*)
       FROM card_progress p
       LEFT JOIN catalog_cards c ON c.id = p.card_id
       WHERE c.id IS NULL) AS orphan_cards,
    (SELECT COUNT(*) FROM (
       SELECT position FROM catalog_cards GROUP BY position HAVING COUNT(*) > 1
     ) duplicate_positions) AS duplicate_positions,
    (SELECT COUNT(*) FROM (
       SELECT name_key FROM learning_profiles
       WHERE name_key IS NOT NULL
       GROUP BY name_key HAVING COUNT(*) > 1
     ) duplicate_name_keys) AS duplicate_name_keys,
    (SELECT COUNT(*) FROM catalog_cards
       WHERE NOT (
         content ?& ARRAY[
           'id', 'german', 'polish', 'article', 'plural',
           'exampleGerman', 'examplePolish', 'category'
         ]
       )) AS cards_missing_required_keys,
    (SELECT COUNT(*) FROM catalog_cards
       WHERE content->>'id' IS DISTINCT FROM id) AS card_id_mismatches,
    (SELECT COUNT(*) FROM card_progress
       WHERE COALESCE(data->>'stage', '') NOT IN ('new', 'learning', 'uncertain', 'known', 'mastered')) AS invalid_stages,
    (SELECT COUNT(*) FROM card_progress
       WHERE COALESCE(data->>'leitnerBox', '') !~ '^[1-5]$') AS invalid_leitner_boxes,
    (SELECT COUNT(*) FROM card_progress
       WHERE data->>'dueAt' IS NOT NULL
         AND data->>'dueAt' !~ '^\\d{4}-\\d{2}-\\d{2}T') AS suspicious_due_dates,
    (SELECT COUNT(*) FROM card_progress
       WHERE jsonb_typeof(data->'reviewHistory') IS DISTINCT FROM 'array') AS invalid_review_history_types,
    (SELECT COUNT(*) FROM card_progress
       WHERE jsonb_typeof(data->'successfulModes') IS DISTINCT FROM 'array') AS invalid_successful_modes_types,
    (SELECT COUNT(*) FROM card_progress p
       CROSS JOIN LATERAL jsonb_array_elements_text(
         CASE WHEN jsonb_typeof(p.data->'successfulModes') = 'array'
           THEN p.data->'successfulModes' ELSE '[]'::jsonb END
       ) mode
       WHERE mode NOT IN (
         'choice-de-pl', 'choice-pl-de', 'choice-article',
         'type-de-pl', 'type-pl-de', 'type-listen-de'
       )) AS invalid_successful_modes
`))[0];

report.historyIntegrity = (await sql.query(`
  SELECT
    COUNT(*) FILTER (WHERE jsonb_typeof(event) <> 'object') AS non_object_events,
    COUNT(*) FILTER (
      WHERE event->>'mode' NOT IN (
        'introduction', 'choice-de-pl', 'choice-pl-de', 'choice-article',
        'type-de-pl', 'type-pl-de', 'type-listen-de'
      )
    ) AS invalid_modes,
    COUNT(*) FILTER (WHERE event->>'rating' NOT IN ('again', 'hard', 'good')) AS invalid_ratings,
    COUNT(*) FILTER (WHERE COALESCE(event->>'fromBox', '') !~ '^[1-5]$') AS invalid_from_boxes,
    COUNT(*) FILTER (WHERE COALESCE(event->>'toBox', '') !~ '^[1-5]$') AS invalid_to_boxes,
    COUNT(*) FILTER (WHERE event->>'reviewedAt' IS NULL) AS missing_reviewed_at
  FROM card_progress p
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(p.data->'reviewHistory') = 'array'
      THEN p.data->'reviewHistory' ELSE '[]'::jsonb END
  ) event
`))[0];

report.checksums = (await sql.query(`
  SELECT
    (SELECT md5(COALESCE(string_agg(id || ':' || position || ':' || content::text, '|' ORDER BY id), ''))
      FROM catalog_cards) AS catalog_legacy,
    (SELECT md5(COALESCE(string_agg(id || ':' || COALESCE(name_key, '') || ':' || meta::text, '|' ORDER BY id), ''))
      FROM learning_profiles) AS profiles_legacy,
    (SELECT md5(COALESCE(string_agg(profile_id || ':' || card_id || ':' || data::text, '|' ORDER BY profile_id, card_id), ''))
      FROM card_progress) AS progress_legacy
`))[0];

report.queryPlans = {
  catalogLoad: (await sql.query(`
    EXPLAIN (FORMAT JSON)
    SELECT content FROM catalog_cards ORDER BY position
  `))[0]["QUERY PLAN"],
  profileProgress: (await sql.query(`
    EXPLAIN (FORMAT JSON)
    SELECT card_id, data
    FROM card_progress
    WHERE profile_id = '00000000-0000-0000-0000-000000000000'::uuid
  `))[0]["QUERY PLAN"],
};

console.log(JSON.stringify(normalize(report), null, 2));
