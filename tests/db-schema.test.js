import { describe, expect, it } from "vitest";
import {
  MIGRATION_ID,
  migrationStatements,
  validationPassed,
} from "../scripts/db-schema-v2.mjs";

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
