import { describe, expect, it } from "vitest";
import {
  MIGRATION_ID,
  migrationStatements,
  validationPassed,
} from "../scripts/db-schema-v2.mjs";
import {
  MIGRATION_ID as GRAMMAR_MIGRATION_ID,
  migrationStatements as grammarMigrationStatements,
  validationPassed as grammarValidationPassed,
} from "../scripts/db-schema-grammar.mjs";

describe("database normalization migration", () => {
  it("is versioned and contains no destructive table or column drops", () => {
    expect(MIGRATION_ID).toMatch(/^\d{8}_\d{3}_/);
    expect(migrationStatements.join("\n")).not.toMatch(/\bDROP\s+(TABLE|COLUMN)\b/i);
  });

  it("rejects any parity or integrity mismatch", () => {
    const valid = {
      catalog_mismatches: 0,
      progress_mismatches: 0,
      profile_meta_mismatches: 0,
      orphan_cards: 0,
      orphan_profiles: 0,
      missing_categories: 0,
      invalid_boxes: 0,
      invalid_stages: 0,
    };
    expect(validationPassed(valid)).toBe(true);
    expect(validationPassed({ ...valid, progress_mismatches: 1 })).toBe(false);
  });
});

describe("grammar migration", () => {
  it("jest wersjonowana, addytywna i chroni osobny postęp gramatyki", () => {
    expect(GRAMMAR_MIGRATION_ID).toMatch(/^\d{8}_\d{3}_/);
    expect(grammarMigrationStatements.join("\n")).not.toMatch(/\bDROP\s+(TABLE|COLUMN)\b/i);
    expect(grammarMigrationStatements.join("\n")).toContain("grammar_topic_progress");
    expect(grammarMigrationStatements.join("\n")).toContain("grammar_attempts");
  });

  it("odrzuca osierocony lub nieprawidłowy postęp gramatyki", () => {
    const valid = {
      grammar_topics: 26,
      published_topics: 26,
      orphan_grammar_progress: 0,
      invalid_grammar_progress: 0,
    };
    expect(grammarValidationPassed(valid)).toBe(true);
    expect(grammarValidationPassed({ ...valid, orphan_grammar_progress: 1 })).toBe(false);
  });
});
