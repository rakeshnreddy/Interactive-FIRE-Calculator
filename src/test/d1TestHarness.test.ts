import { describe, expect, it } from "vitest";
import { ALL_DATABASE_TABLES, createD1TestHarness } from "./d1TestHarness";

describe("d1TestHarness (B05 persistence foundation)", () => {
  it("applies all migrations and provisions all 15 tables", () => {
    const harness = createD1TestHarness();
    const counts = harness.getTableCounts();

    for (const table of ALL_DATABASE_TABLES) {
      expect(counts[table]).toBe(0);
    }
  });

  it("enforces foreign key constraints", async () => {
    const harness = createD1TestHarness();

    // Trying to insert an account for non-existent user should fail with FK error
    await expect(
      harness.db
        .prepare(
          "INSERT INTO financial_accounts (id, user_id, name, account_type, currency, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind("acc_1", "nonexistent_user", "Checking", "checking", "USD", 1, "2026-09-14", "2026-09-14")
        .run()
    ).rejects.toThrow(/FOREIGN KEY/i);
  });

  it("enforces json_valid CHECK constraint", async () => {
    const harness = createD1TestHarness();

    // Insert user first
    await harness.db
      .prepare("INSERT INTO users (id, provider, provider_user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)")
      .bind("u1", "clerk", "u1", "2026-09-14", "2026-09-14")
      .run();

    // Invalid JSON in assumptions
    await expect(
      harness.db
        .prepare("INSERT INTO assumptions (id, user_id, name, assumption_type, value_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .bind("a1", "u1", "Inflation", "macro", "{not-valid-json", "2026-09-14", "2026-09-14")
        .run()
    ).rejects.toThrow(/CHECK constraint failed/i);
  });

  it("accurately takes snapshots and asserts no changes for a specific user", async () => {
    const harness = createD1TestHarness();

    // Insert user A and user B
    await harness.db
      .prepare("INSERT INTO users (id, provider, provider_user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)")
      .bind("user_A", "clerk", "user_A", "2026-09-14", "2026-09-14")
      .run();
    await harness.db
      .prepare("INSERT INTO users (id, provider, provider_user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)")
      .bind("user_B", "clerk", "user_B", "2026-09-14", "2026-09-14")
      .run();

    const before = harness.takeDatabaseSnapshot();

    // User A creates an account
    await harness.db
      .prepare("INSERT INTO financial_accounts (id, user_id, name, account_type, currency, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .bind("acc_A1", "user_A", "Savings", "savings", "USD", 1, "2026-09-14", "2026-09-14")
      .run();

    const after = harness.takeDatabaseSnapshot();

    // User B should have ZERO changes
    expect(() => harness.assertNoChangesForUser(before, after, "user_B")).not.toThrow();

    // User A DID have changes, so asserting no changes for User A should throw
    expect(() => harness.assertNoChangesForUser(before, after, "user_A")).toThrow(/Unexpected database modification for user user_A/i);
  });
});
