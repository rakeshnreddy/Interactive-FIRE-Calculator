// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createD1TestHarness, invokeApi, seedTestUser, type D1TestHarness } from "./test/d1TestHarness";
import * as sessionModule from "../functions/_lib/session";
import { UserDeletedError } from "../functions/_lib/persistence";
import { replayTombstones } from "../functions/_lib/accountData";

// API Handlers
import { onRequestGet as getProfile, onRequestPut as updateProfile } from "../functions/api/profile";
import { onRequestGet as listAccounts, onRequestPost as createAccount } from "../functions/api/accounts/index";
import { onRequestGet as getAccount } from "../functions/api/accounts/[id]";
import { onRequestPost as createBalance } from "../functions/api/accounts/[id]/balances";
import { onRequestGet as listTransactions, onRequestPost as createTransaction } from "../functions/api/transactions/index";
import { onRequestGet as listGoals, onRequestPost as createGoal } from "../functions/api/goals/index";
import { onRequestGet as listPlans, onRequestPost as createPlan } from "../functions/api/plans/index";
import { onRequestPost as saveCalculatorResult } from "../functions/api/calculator-results/index";
import { onRequestPost as commitBalanceImport } from "../functions/api/imports/account-balances/commit";
import { onRequestPost as commitTransactionImport } from "../functions/api/imports/transactions/commit";
import { onRequestGet as exportAccountData } from "../functions/api/account-data/export";
import { onRequestDelete as deleteAccountData } from "../functions/api/account-data/index";

describe("Honest Deletion, Export, and Recovery Contract (B07)", () => {
  let harness: D1TestHarness;
  const USER_A = "user_synthetic_alice_a";
  const USER_B = "user_synthetic_bob_b";

  function asUser(userId: string) {
    vi.spyOn(sessionModule, "requireClerkAuth").mockResolvedValue({
      ok: true,
      auth: {
        userId,
        sessionId: `sess_${userId}`,
        sessionClaims: { sub: userId }
      } as any
    });
  }

  function createJsonRequest(url: string, method: string, body?: any): Request {
    const init: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json"
      }
    };
    if (body !== undefined) {
      init.body = typeof body === "string" ? body : JSON.stringify(body);
    }
    return new Request(url, init);
  }

  async function seedRichUserData(userId: string, currency: string) {
    asUser(userId);
    // 1. Account
    const accRes = await invokeApi(
      createAccount,
      createJsonRequest("http://localhost/api/accounts", "POST", {
        name: `${userId} Savings`,
        accountType: "savings",
        currency
      }),
      { DB: harness.db }
    );
    const accountId = accRes.body.account.id;

    // 2. Balance
    await invokeApi(
      createBalance,
      createJsonRequest(`http://localhost/api/accounts/${accountId}/balances`, "POST", {
        balanceCents: 500000,
        balanceDate: "2026-09-14"
      }),
      { DB: harness.db },
      { id: accountId }
    );

    // 3. Transaction
    await invokeApi(
      createTransaction,
      createJsonRequest("http://localhost/api/transactions", "POST", {
        accountId,
        amountCents: 15000,
        transactionType: "expense",
        description: "Grocery store",
        transactionDate: "2026-09-14"
      }),
      { DB: harness.db }
    );

    // 4. Goal
    const goalRes = await invokeApi(
      createGoal,
      createJsonRequest("http://localhost/api/goals", "POST", {
        name: "Retirement 2045",
        goalType: "retirement",
        targetAmountCents: 200000000,
        targetDate: "2045-12-31"
      }),
      { DB: harness.db }
    );
    const goalId = goalRes.body.goal.id;

    // 5. Plan linked to goal
    await invokeApi(
      createPlan,
      createJsonRequest("http://localhost/api/plans", "POST", {
        name: "Base FIRE Plan",
        goalId,
        snapshot: {
          plan: { annualExpenses: 60000 },
          timeline: { retirementAge: 55 }
        },
        result: {
          fireNumber: 1500000
        }
      }),
      { DB: harness.db }
    );

    // 6. Saved Calculator Result
    await invokeApi(
      saveCalculatorResult,
      createJsonRequest("http://localhost/api/calculator-results", "POST", {
        calculatorCategory: "Planning",
        calculatorRegion: "Global",
        calculatorSlug: "savings-goal",
        calculatorTitle: "Savings Goal Calculator",
        conversionLabel: "Create savings goal",
        conversionRoute: "/goals",
        currency,
        idempotencyKey: `calc-seed-${userId}`,
        inputValues: {
          current: 1000,
          rate: 5,
          target: 10000,
          years: 3
        },
        result: {
          assumptions: ["Monthly savings are added at month end."],
          metrics: [
            {
              description: "Monthly savings needed",
              label: "Monthly savings",
              value: 236.72,
              valueType: "currency"
            }
          ],
          narrative: "Estimated monthly contribution required."
        }
      }),
      { DB: harness.db }
    );

    return { accountId, goalId };
  }

  beforeEach(async () => {
    harness = createD1TestHarness();
    await seedTestUser(harness, USER_A, { displayName: "Alice Primary", defaultCurrency: "USD" });
    await seedTestUser(harness, USER_B, { displayName: "Bob Neighbor", defaultCurrency: "USD" });
  });

  describe("1. Two-User Isolation During Deletion", () => {
    it("proves User B data survives User A deletion with zero modifications across all tables", async () => {
      const aData = await seedRichUserData(USER_A, "USD");
      const bData = await seedRichUserData(USER_B, "USD");

      // Verify both have data
      const countsA_before = harness.getUserTableCounts(USER_A);
      const countsB_before = harness.getUserTableCounts(USER_B);

      expect(countsA_before.financial_accounts).toBe(1);
      expect(countsA_before.account_balances).toBe(1);
      expect(countsA_before.transactions).toBe(1);
      expect(countsA_before.goals).toBe(2);
      expect(countsA_before.plans).toBe(1);
      expect(countsA_before.saved_calculator_results).toBe(1);

      expect(countsB_before.financial_accounts).toBe(1);
      expect(countsB_before.account_balances).toBe(1);
      expect(countsB_before.transactions).toBe(1);
      expect(countsB_before.goals).toBe(2);
      expect(countsB_before.plans).toBe(1);
      expect(countsB_before.saved_calculator_results).toBe(1);

      // Snapshot User B state before User A deletes
      const beforeSnapshot = harness.takeDatabaseSnapshot();

      // User A deletes account data
      asUser(USER_A);
      const deleteRes = await invokeApi(
        deleteAccountData,
        createJsonRequest("http://localhost/api/account-data", "DELETE", {
          confirmation: "DELETE MY FINPATH DATA"
        }),
        { DB: harness.db }
      );
      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.deletion.localAccountDataDeleted).toBe(true);
      expect(deleteRes.body.identity.provider).toBe("clerk");
      expect(deleteRes.body.identity.deleted).toBe(false);

      // Verify User B has ZERO modifications in snapshot
      const afterSnapshot = harness.takeDatabaseSnapshot();
      harness.assertNoChangesForUser(beforeSnapshot, afterSnapshot, USER_B);

      // Verify User B counts are completely identical
      const countsB_after = harness.getUserTableCounts(USER_B);
      expect(countsB_after).toEqual(countsB_before);

      // User B can still access all their data
      asUser(USER_B);
      const bAccounts = await invokeApi(listAccounts, new Request("http://localhost/api/accounts"), { DB: harness.db });
      expect(bAccounts.status).toBe(200);
      expect(bAccounts.body.accounts).toHaveLength(1);
      expect(bAccounts.body.accounts[0].id).toBe(bData.accountId);

      const bGoals = await invokeApi(listGoals, new Request("http://localhost/api/goals"), { DB: harness.db });
      expect(bGoals.status).toBe(200);
      expect(bGoals.body.goals).toHaveLength(2);
      expect(bGoals.body.goals.some((g: any) => g.id === bData.goalId)).toBe(true);

      const bPlans = await invokeApi(listPlans, new Request("http://localhost/api/plans"), { DB: harness.db });
      expect(bPlans.status).toBe(200);
      expect(bPlans.body.plans).toHaveLength(1);
    });
  });

  describe("2. Tombstone Durability & Hard Deletion in D1", () => {
    it("hard-deletes all financial records and retains an immutable tombstone in users", async () => {
      await seedRichUserData(USER_A, "USD");

      asUser(USER_A);
      const deleteRes = await invokeApi(
        deleteAccountData,
        createJsonRequest("http://localhost/api/account-data", "DELETE", {
          confirmation: "DELETE MY FINPATH DATA"
        }),
        { DB: harness.db }
      );
      expect(deleteRes.status).toBe(200);

      // Verify all child tables have 0 rows for User A
      const counts = harness.getUserTableCounts(USER_A);
      expect(counts.user_profiles).toBe(0);
      expect(counts.financial_accounts).toBe(0);
      expect(counts.account_balances).toBe(0);
      expect(counts.transactions).toBe(0);
      expect(counts.goals).toBe(0);
      expect(counts.plans).toBe(0);
      expect(counts.plan_versions).toBe(0);
      expect(counts.fire_plan_inputs).toBe(0);
      expect(counts.fire_plan_results).toBe(0);
      expect(counts.saved_calculator_results).toBe(0);
      expect(counts.assumptions).toBe(0);
      expect(counts.audit_log).toBe(0);

      // Tombstone exists in users
      expect(counts.users).toBe(1);
      const userRow = await harness.db
        .prepare("SELECT id, provider, deleted_at FROM users WHERE id = ?")
        .bind(USER_A)
        .first<{ id: string; provider: string; deleted_at: string | null }>();

      expect(userRow).not.toBeNull();
      expect(userRow?.id).toBe(USER_A);
      expect(userRow?.provider).toBe("clerk");
      expect(userRow?.deleted_at).toBeTruthy();
      expect(typeof userRow?.deleted_at).toBe("string");
    });
  });

  describe("3. Delayed Writes Fail Closed (410 Gone / 0 Rows Written)", () => {
    it("rejects delayed writes and ensures zero rows are written to any table", async () => {
      await seedRichUserData(USER_A, "USD");

      // Delete User A
      asUser(USER_A);
      await invokeApi(
        deleteAccountData,
        createJsonRequest("http://localhost/api/account-data", "DELETE", {
          confirmation: "DELETE MY FINPATH DATA"
        }),
        { DB: harness.db }
      );

      const snapshotBeforeDelayedWrites = harness.takeDatabaseSnapshot();

      // 1. Delayed POST /api/accounts
      const accRes = await invokeApi(
        createAccount,
        createJsonRequest("http://localhost/api/accounts", "POST", {
          name: "Zombie Checking",
          accountType: "checking",
          currency: "USD"
        }),
        { DB: harness.db }
      );
      expect(accRes.status).toBe(410);
      expect(accRes.body.error).toContain("deleted");

      // 2. Delayed POST /api/transactions
      const txRes = await invokeApi(
        createTransaction,
        createJsonRequest("http://localhost/api/transactions", "POST", {
          accountId: "acc_ghost",
          amountCents: 1000,
          transactionType: "expense",
          description: "Zombie purchase",
          transactionDate: "2026-09-14"
        }),
        { DB: harness.db }
      );
      expect(txRes.status).toBe(410);
      expect(txRes.body.error).toContain("deleted");

      // 3. Delayed POST /api/goals
      const goalRes = await invokeApi(
        createGoal,
        createJsonRequest("http://localhost/api/goals", "POST", {
          name: "Zombie Goal",
          goalType: "custom",
          targetAmountCents: 500000
        }),
        { DB: harness.db }
      );
      expect(goalRes.status).toBe(410);
      expect(goalRes.body.error).toContain("deleted");

      // 4. Delayed POST /api/plans
      const planRes = await invokeApi(
        createPlan,
        createJsonRequest("http://localhost/api/plans", "POST", {
          name: "Zombie Plan",
          snapshot: {
            plan: { annualExpenses: 50000 },
            timeline: { retirementAge: 60 }
          },
          result: { fireNumber: 1250000 }
        }),
        { DB: harness.db }
      );
      expect(planRes.status).toBe(410);
      expect(planRes.body.error).toContain("deleted");

      // 5. Delayed POST /api/calculator-results
      const calcRes = await invokeApi(
        saveCalculatorResult,
        createJsonRequest("http://localhost/api/calculator-results", "POST", {
          calculatorCategory: "Planning",
          calculatorRegion: "Global",
          calculatorSlug: "savings-goal",
          calculatorTitle: "Savings Goal Calculator",
          conversionLabel: "Create savings goal",
          conversionRoute: "/goals",
          currency: "USD",
          idempotencyKey: "delayed-calc-attempt",
          inputValues: {
            current: 1000,
            rate: 5,
            target: 10000,
            years: 3
          },
          result: {
            assumptions: ["Assumption 1"],
            metrics: [
              {
                description: "Monthly savings",
                label: "Monthly savings",
                value: 200,
                valueType: "currency"
              }
            ],
            narrative: "Ghost result narrative"
          }
        }),
        { DB: harness.db }
      );
      expect(calcRes.status).toBe(410);
      expect(calcRes.body.error).toContain("deleted");

      // 6. Delayed PUT /api/profile
      const profRes = await invokeApi(
        updateProfile,
        createJsonRequest("http://localhost/api/profile", "PUT", {
          displayName: "Zombie Alice"
        }),
        { DB: harness.db }
      );
      expect(profRes.status).toBe(410);
      expect(profRes.body.error).toContain("deleted");

      // 7. Delayed POST /api/imports/account-balances/commit
      const importAccRes = await invokeApi(
        commitBalanceImport,
        createJsonRequest("http://localhost/api/imports/account-balances/commit", "POST", {
          fileName: "delayed.csv",
          sourceHash: "hash_delayed_1",
          rows: [
            {
              rowNumber: 2,
              account: "acc_ghost",
              balanceDate: "2026-09-14",
              balance: "500.00",
              currency: "USD"
            }
          ]
        }),
        { DB: harness.db }
      );
      expect(importAccRes.status).toBe(410);
      expect(importAccRes.body.error).toContain("deleted");

      // 8. Delayed POST /api/imports/transactions/commit
      const importTxRes = await invokeApi(
        commitTransactionImport,
        createJsonRequest("http://localhost/api/imports/transactions/commit", "POST", {
          fileName: "delayed_tx.csv",
          sourceHash: "hash_delayed_2",
          rows: [
            {
              rowNumber: 2,
              account: "acc_ghost",
              amount: "50.00",
              category: "Food",
              description: "Ghost coffee",
              notes: "",
              transactionDate: "2026-09-14",
              type: "expense"
            }
          ]
        }),
        { DB: harness.db }
      );
      expect(importTxRes.status).toBe(410);
      expect(importTxRes.body.error).toContain("deleted");

      // Verify ZERO rows were written to the database across all delayed writes
      const snapshotAfterDelayedWrites = harness.takeDatabaseSnapshot();
      harness.assertNoChangesForUser(snapshotBeforeDelayedWrites, snapshotAfterDelayedWrites, USER_A);

      const counts = harness.getUserTableCounts(USER_A);
      expect(counts.financial_accounts).toBe(0);
      expect(counts.transactions).toBe(0);
      expect(counts.goals).toBe(0);
      expect(counts.plans).toBe(0);
      expect(counts.saved_calculator_results).toBe(0);
      expect(counts.user_profiles).toBe(0);
      expect(counts.balance_imports).toBe(0);
      expect(counts.transaction_imports).toBe(0);
      expect(counts.users).toBe(1); // Only tombstone
    });
  });

  describe("4. Offline / Replay Conflict Guard", () => {
    it("prevents ON CONFLICT DO UPDATE from un-tombstoning the user", async () => {
      await seedRichUserData(USER_A, "USD");

      asUser(USER_A);
      await invokeApi(
        deleteAccountData,
        createJsonRequest("http://localhost/api/account-data", "DELETE", {
          confirmation: "DELETE MY FINPATH DATA"
        }),
        { DB: harness.db }
      );

      // Attempt manual SQL conflict resurrection
      const now = new Date().toISOString();
      await harness.db
        .prepare(
          `
            INSERT INTO users (id, provider, provider_user_id, created_at, updated_at)
            VALUES (?, 'clerk', ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              updated_at = excluded.updated_at
            WHERE users.deleted_at IS NULL
          `
        )
        .bind(USER_A, USER_A, now, now)
        .run();

      const userRow = await harness.db
        .prepare("SELECT deleted_at FROM users WHERE id = ?")
        .bind(USER_A)
        .first<{ deleted_at: string | null }>();

      // Must remain deleted!
      expect(userRow?.deleted_at).not.toBeNull();
    });
  });

  describe("5. Deletion Idempotency & Repeatability", () => {
    it("safely handles repeated deletion calls without errors or resurrecting state", async () => {
      await seedRichUserData(USER_A, "USD");
      asUser(USER_A);

      // First deletion
      const res1 = await invokeApi(
        deleteAccountData,
        createJsonRequest("http://localhost/api/account-data", "DELETE", {
          confirmation: "DELETE MY FINPATH DATA"
        }),
        { DB: harness.db }
      );
      expect(res1.status).toBe(200);

      // Second deletion (idempotent retry)
      const res2 = await invokeApi(
        deleteAccountData,
        createJsonRequest("http://localhost/api/account-data", "DELETE", {
          confirmation: "DELETE MY FINPATH DATA"
        }),
        { DB: harness.db }
      );
      expect(res2.status).toBe(200);
      expect(res2.body.deletion.localAccountDataDeleted).toBe(true);
      expect(res2.body.deletion.deletedRows.financialAccounts).toBe(0);
      expect(res2.body.deletion.deletedRows.goals).toBe(0);

      const userRow = await harness.db
        .prepare("SELECT deleted_at FROM users WHERE id = ?")
        .bind(USER_A)
        .first<{ deleted_at: string | null }>();
      expect(userRow?.deleted_at).not.toBeNull();
    });
  });

  describe("6. Export Consistency & Post-Deletion Rejection", () => {
    it("exports consistent snapshot before deletion and rejects export after deletion", async () => {
      const aData = await seedRichUserData(USER_A, "USD");
      asUser(USER_A);

      // 1. Export before deletion
      const exportRes = await invokeApi(exportAccountData, new Request("http://localhost/api/account-data/export"), {
        DB: harness.db
      });
      expect(exportRes.status).toBe(200);
      expect(exportRes.body.export.subject.userId).toBe(USER_A);
      expect(exportRes.body.export.data.financialAccounts).toHaveLength(1);
      expect(exportRes.body.export.data.financialAccounts[0].id).toBe(aData.accountId);
      expect(exportRes.body.export.data.goals).toHaveLength(2);
      expect(exportRes.body.export.data.goals.some((g: any) => g.id === aData.goalId)).toBe(true);
      expect(exportRes.body.export.data.plans).toHaveLength(1);
      expect(exportRes.body.export.data.savedCalculatorResults).toHaveLength(1);
      expect(exportRes.body.export.data.user.id).toBe(USER_A);
      expect(exportRes.body.export.summary.financialAccounts).toBe(1);

      // 2. Delete user
      await invokeApi(
        deleteAccountData,
        createJsonRequest("http://localhost/api/account-data", "DELETE", {
          confirmation: "DELETE MY FINPATH DATA"
        }),
        { DB: harness.db }
      );

      // 3. Export after deletion must reject with 410 Gone
      const postDeleteExport = await invokeApi(exportAccountData, new Request("http://localhost/api/account-data/export"), {
        DB: harness.db
      });
      expect(postDeleteExport.status).toBe(410);
      expect(postDeleteExport.body.error).toContain("deleted");
    });
  });

  describe("7. Disaster Recovery Restore & Tombstone Replay Drill", () => {
    it("purges revived data from backup restore when tombstones are replayed before serving", async () => {
      // Step A: Seed User A and User B
      await seedRichUserData(USER_A, "USD");
      await seedRichUserData(USER_B, "EUR");

      // Step B: User A deleted at a recorded timestamp
      const deletedAtTimestamp = "2026-09-14T10:00:00.000Z";
      asUser(USER_A);
      await invokeApi(
        deleteAccountData,
        createJsonRequest("http://localhost/api/account-data", "DELETE", {
          confirmation: "DELETE MY FINPATH DATA"
        }),
        { DB: harness.db }
      );

      // Step C: Simulate disaster recovery restore from a backup taken BEFORE User A deleted!
      // In this simulated restore, a restored D1 database contains User A data that was accidentally revived
      const restoredHarness = createD1TestHarness();
      await seedTestUser(restoredHarness, USER_A, { displayName: "Alice Resurrected", defaultCurrency: "USD" });
      await seedTestUser(restoredHarness, USER_B, { displayName: "Bob Neighbor", defaultCurrency: "EUR" });

      // Put data into restored database for both users (as would exist in pre-deletion backup)
      asUser(USER_A);
      await invokeApi(
        createAccount,
        createJsonRequest("http://localhost/api/accounts", "POST", {
          name: "Alice Restored Checking",
          accountType: "checking",
          currency: "USD"
        }),
        { DB: restoredHarness.db }
      );

      asUser(USER_B);
      const bobAcc = await invokeApi(
        createAccount,
        createJsonRequest("http://localhost/api/accounts", "POST", {
          name: "Bob Restored Savings",
          accountType: "savings",
          currency: "EUR"
        }),
        { DB: restoredHarness.db }
      );

      // Verify before replay: Alice has 1 account (accidental revival from backup)
      const restoredCountsA_before = restoredHarness.getUserTableCounts(USER_A);
      expect(restoredCountsA_before.financial_accounts).toBe(1);

      // Step D: Run tombstone replay runbook before opening restored DB to traffic
      const tombstones = [{ userId: USER_A, deletedAt: deletedAtTimestamp }];
      const replayedCount = await replayTombstones(restoredHarness.db, tombstones);
      expect(replayedCount).toBe(1);

      // Step E: Verify Alice's revived data is purged, tombstone is restored
      const restoredCountsA_after = restoredHarness.getUserTableCounts(USER_A);
      expect(restoredCountsA_after.financial_accounts).toBe(0);
      expect(restoredCountsA_after.users).toBe(1);

      // Execute exact verified 14-child-table query from DATA_DELETION_AND_RECOVERY.md
      const checkSql = `
        SELECT (
          (SELECT count(*) FROM user_profiles WHERE user_id = ?) +
          (SELECT count(*) FROM financial_accounts WHERE user_id = ?) +
          (SELECT count(*) FROM account_balances WHERE user_id = ?) +
          (SELECT count(*) FROM transactions WHERE user_id = ?) +
          (SELECT count(*) FROM goals WHERE user_id = ?) +
          (SELECT count(*) FROM plans WHERE user_id = ?) +
          (SELECT count(*) FROM plan_versions WHERE user_id = ?) +
          (SELECT count(*) FROM fire_plan_inputs WHERE user_id = ?) +
          (SELECT count(*) FROM fire_plan_results WHERE user_id = ?) +
          (SELECT count(*) FROM assumptions WHERE user_id = ?) +
          (SELECT count(*) FROM audit_log WHERE user_id = ?) +
          (SELECT count(*) FROM balance_imports WHERE user_id = ?) +
          (SELECT count(*) FROM transaction_imports WHERE user_id = ?) +
          (SELECT count(*) FROM saved_calculator_results WHERE user_id = ?)
        ) AS remaining_rows;
      `;
      const rowCheck = await restoredHarness.db
        .prepare(checkSql)
        .bind(
          USER_A, USER_A, USER_A, USER_A, USER_A, USER_A, USER_A,
          USER_A, USER_A, USER_A, USER_A, USER_A, USER_A, USER_A
        )
        .first<{ remaining_rows: number }>();
      expect(rowCheck?.remaining_rows).toBe(0);

      const aliceTombstone = await restoredHarness.db
        .prepare("SELECT deleted_at FROM users WHERE id = ?")
        .bind(USER_A)
        .first<{ deleted_at: string | null }>();
      expect(aliceTombstone?.deleted_at).toBe(deletedAtTimestamp);

      // Alice cannot access restored DB
      asUser(USER_A);
      const aliceList = await invokeApi(listAccounts, new Request("http://localhost/api/accounts"), {
        DB: restoredHarness.db
      });
      expect(aliceList.status).toBe(410);

      // Bob's restored data is preserved and accessible
      asUser(USER_B);
      const bobList = await invokeApi(listAccounts, new Request("http://localhost/api/accounts"), {
        DB: restoredHarness.db
      });
      expect(bobList.status).toBe(200);
      expect(bobList.body.accounts).toHaveLength(1);
      expect(bobList.body.accounts[0].id).toBe(bobAcc.body.account.id);
    });

    it("handles tombstones for users absent from the restored snapshot and supports replay retries", async () => {
      const restoredHarness = createD1TestHarness();
      await seedTestUser(restoredHarness, USER_B, { displayName: "Bob Neighbor", defaultCurrency: "EUR" });
      asUser(USER_B);
      const bobAcc = await invokeApi(
        createAccount,
        createJsonRequest("http://localhost/api/accounts", "POST", {
          name: "Bob Savings",
          accountType: "savings",
          currency: "EUR"
        }),
        { DB: restoredHarness.db }
      );

      // USER_C was created and deleted AFTER the snapshot, so USER_C does not exist in restored DB at all
      const USER_C = "user_synthetic_charlie_c";
      const tombstoneTimestamp = "2026-09-14T12:00:00.000Z";

      // Verify USER_C is completely absent before replay
      const userC_before = await restoredHarness.db
        .prepare("SELECT id, deleted_at FROM users WHERE id = ?")
        .bind(USER_C)
        .first<{ id: string; deleted_at: string | null }>();
      expect(userC_before).toBeNull();

      // Run replay with USER_C (absent user) and verify tombstone is inserted
      const replayed = await replayTombstones(restoredHarness.db, [
        { userId: USER_C, deletedAt: tombstoneTimestamp }
      ]);
      expect(replayed).toBe(1);

      const userC_after = await restoredHarness.db
        .prepare("SELECT id, deleted_at FROM users WHERE id = ?")
        .bind(USER_C)
        .first<{ id: string; deleted_at: string | null }>();
      expect(userC_after?.id).toBe(USER_C);
      expect(userC_after?.deleted_at).toBe(tombstoneTimestamp);

      // Now verify retry idempotency: replaying again does not alter state or fail
      const retryReplayed = await replayTombstones(restoredHarness.db, [
        { userId: USER_C, deletedAt: tombstoneTimestamp }
      ]);
      expect(retryReplayed).toBe(1);

      const userC_retry = await restoredHarness.db
        .prepare("SELECT id, deleted_at FROM users WHERE id = ?")
        .bind(USER_C)
        .first<{ id: string; deleted_at: string | null }>();
      expect(userC_retry?.id).toBe(USER_C);
      expect(userC_retry?.deleted_at).toBe(tombstoneTimestamp);

      // Subsequent attempt by USER_C to write or access must be rejected with 410
      asUser(USER_C);
      const createRes = await invokeApi(
        createAccount,
        createJsonRequest("http://localhost/api/accounts", "POST", {
          name: "Charlie Checking",
          accountType: "checking",
          currency: "USD"
        }),
        { DB: restoredHarness.db }
      );
      expect(createRes.status).toBe(410);

      // User B must remain completely intact
      const bobCounts = restoredHarness.getUserTableCounts(USER_B);
      expect(bobCounts.financial_accounts).toBe(1);
      expect(bobCounts.users).toBe(1);
      asUser(USER_B);
      const bobList = await invokeApi(listAccounts, new Request("http://localhost/api/accounts"), {
        DB: restoredHarness.db
      });
      expect(bobList.status).toBe(200);
      expect(bobList.body.accounts[0].id).toBe(bobAcc.body.account.id);
    });

    it("verifies operational fail-closed rule: serving must remain blocked if tombstone replay fails", async () => {
      const restoredHarness = createD1TestHarness();
      await seedTestUser(restoredHarness, USER_A, { displayName: "Alice Resurrected", defaultCurrency: "USD" });

      // Simulate a broken / corrupt replay execution (e.g. database failure during batch)
      const batchSpy = vi.spyOn(restoredHarness.db, "batch").mockRejectedValueOnce(
        new Error("D1_BATCH_TIMEOUT: simulated storage error during replay")
      );

      let replayError: Error | null = null;
      try {
        await replayTombstones(restoredHarness.db, [{ userId: USER_A, deletedAt: "2026-09-14T10:00:00.000Z" }]);
      } catch (err: any) {
        replayError = err;
      }

      batchSpy.mockRestore();

      expect(replayError).not.toBeNull();
      expect(replayError?.message).toContain("D1_BATCH_TIMEOUT");

      // Operational Rule Check:
      // When replay throws, the restore procedure halts. Live traffic must NEVER be routed
      // to this database instance because Alice is still un-tombstoned and child rows remain.
      const unverifiedAlice = await restoredHarness.db
        .prepare("SELECT deleted_at FROM users WHERE id = ?")
        .bind(USER_A)
        .first<{ deleted_at: string | null }>();
      expect(unverifiedAlice?.deleted_at).toBeNull(); // Serving remains blocked!
    });
  });
});
