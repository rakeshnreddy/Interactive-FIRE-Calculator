import { beforeEach, describe, expect, it, vi } from "vitest";
import { createD1TestHarness, invokeApi, seedTestUser, type D1TestHarness } from "./test/d1TestHarness";
import * as sessionModule from "../functions/_lib/session";

// Endpoint handlers
import { onRequestGet as getMe } from "../functions/api/me";
import { onRequestGet as getProfile, onRequestPut as updateProfile } from "../functions/api/profile";
import { onRequestGet as getDashboard } from "../functions/api/dashboard";
import { onRequestGet as listAccounts, onRequestPost as createAccount } from "../functions/api/accounts/index";
import { onRequestDelete as deleteAccount, onRequestGet as getAccount, onRequestPut as updateAccount } from "../functions/api/accounts/[id]";
import { onRequestGet as getBalances, onRequestPost as createBalance } from "../functions/api/accounts/[id]/balances";
import { onRequestGet as listTransactions, onRequestPost as createTransaction } from "../functions/api/transactions/index";
import { onRequestDelete as deleteTransaction, onRequestGet as getTransaction, onRequestPut as updateTransaction } from "../functions/api/transactions/[id]";
import { onRequestGet as listGoals, onRequestPost as createGoal } from "../functions/api/goals/index";
import { onRequestDelete as deleteGoal, onRequestGet as getGoal, onRequestPut as updateGoal } from "../functions/api/goals/[id]";
import { onRequestGet as listPlans, onRequestPost as createPlan } from "../functions/api/plans/index";
import { onRequestDelete as deletePlan, onRequestGet as getPlan, onRequestPut as updatePlan } from "../functions/api/plans/[id]";
import { onRequestGet as listPlanVersions } from "../functions/api/plans/[id]/versions";
import { onRequestGet as getPlanVersion } from "../functions/api/plans/[id]/versions/[versionNumber]";
import { onRequestGet as listCalculatorResults, onRequestPost as saveCalculatorResult } from "../functions/api/calculator-results/index";
import { onRequestGet as listBalanceImports } from "../functions/api/imports/account-balances/index";
import { onRequestPost as previewBalanceImport } from "../functions/api/imports/account-balances/preview";
import { onRequestPost as commitBalanceImport } from "../functions/api/imports/account-balances/commit";
import { onRequestGet as listTransactionImports } from "../functions/api/imports/transactions/index";
import { onRequestPost as previewTransactionImport } from "../functions/api/imports/transactions/preview";
import { onRequestPost as commitTransactionImport } from "../functions/api/imports/transactions/commit";
import { onRequestGet as exportAccountData } from "../functions/api/account-data/export";
import { onRequestDelete as deleteAccountData } from "../functions/api/account-data/index";

describe("Tenancy and Auth Boundary Harness (B05)", () => {
  let harness: D1TestHarness;
  const USER_A = "user_synthetic_A";
  const USER_B = "user_synthetic_B";

  function asUser(userId: string | null) {
    if (userId === null) {
      vi.spyOn(sessionModule, "requireClerkAuth").mockResolvedValue({
        ok: false,
        response: new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        })
      });
    } else {
      vi.spyOn(sessionModule, "requireClerkAuth").mockResolvedValue({
        ok: true,
        auth: {
          userId,
          sessionId: `sess_${userId}`,
          sessionClaims: { sub: userId }
        } as any
      });
    }
  }

  function createJsonRequest(url: string, method: string, body?: any, headers?: Record<string, string>): Request {
    const init: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers
      }
    };
    if (body !== undefined) {
      init.body = typeof body === "string" ? body : JSON.stringify(body);
    }
    return new Request(url, init);
  }

  beforeEach(async () => {
    harness = createD1TestHarness();
    await seedTestUser(harness, USER_A, { displayName: "Alice Resident", defaultCurrency: "USD" });
    await seedTestUser(harness, USER_B, { displayName: "Bob Neighbor", defaultCurrency: "EUR" });
  });

  describe("1. Identity & Profile Tenancy", () => {
    it("reports verified user ID for authenticated caller and rejects unauthenticated caller", async () => {
      asUser(USER_A);
      const resA = await invokeApi(getMe, new Request("http://localhost/api/me"), { DB: harness.db });
      expect(resA.status).toBe(200);
      expect(resA.body.userId).toBe(USER_A);

      asUser(null);
      const resAnon = await invokeApi(getMe, new Request("http://localhost/api/me"), { DB: harness.db });
      expect(resAnon.status).toBe(401);
      expect(resAnon.body).toEqual({ error: "Unauthorized" });
    });

    it("isolates user profile reading and updating without cross-tenant bleed", async () => {
      asUser(USER_A);
      const getResA = await invokeApi(getProfile, new Request("http://localhost/api/profile"), { DB: harness.db });
      expect(getResA.status).toBe(200);
      expect(getResA.body.profile.displayName).toBe("Alice Resident");
      expect(getResA.body.profile.defaultCurrency).toBe("USD");

      asUser(USER_B);
      const getResB = await invokeApi(getProfile, new Request("http://localhost/api/profile"), { DB: harness.db });
      expect(getResB.status).toBe(200);
      expect(getResB.body.profile.displayName).toBe("Bob Neighbor");
      expect(getResB.body.profile.defaultCurrency).toBe("EUR");

      // User A updates profile
      const beforeSnapshot = harness.takeDatabaseSnapshot();
      asUser(USER_A);
      const putResA = await invokeApi(
        updateProfile,
        createJsonRequest("http://localhost/api/profile", "PUT", {
          displayName: "Alice Updated",
          defaultCurrency: "USD",
          targetRetirementAge: 55
        }),
        { DB: harness.db }
      );
      expect(putResA.status).toBe(200);
      expect(putResA.body.profile.displayName).toBe("Alice Updated");

      const afterSnapshot = harness.takeDatabaseSnapshot();
      // Proves User B is completely untouched
      harness.assertNoChangesForUser(beforeSnapshot, afterSnapshot, USER_B);

      // Verify User B still sees original profile
      asUser(USER_B);
      const getResBAfter = await invokeApi(getProfile, new Request("http://localhost/api/profile"), { DB: harness.db });
      expect(getResBAfter.body.profile.displayName).toBe("Bob Neighbor");
    });
  });

  describe("2. Accounts Tenancy & Operations", () => {
    it("denies access to foreign accounts across read, update, delete and balance operations", async () => {
      // User A creates Account A1
      asUser(USER_A);
      const createResA = await invokeApi(
        createAccount,
        createJsonRequest("http://localhost/api/accounts", "POST", {
          name: "Alice Checking",
          accountType: "checking",
          currency: "USD"
        }),
        { DB: harness.db }
      );
      expect(createResA.status).toBe(201);
      const accountAId = createResA.body.account.id;

      // User B creates Account B1
      asUser(USER_B);
      const createResB = await invokeApi(
        createAccount,
        createJsonRequest("http://localhost/api/accounts", "POST", {
          name: "Bob Savings",
          accountType: "savings",
          currency: "EUR"
        }),
        { DB: harness.db }
      );
      expect(createResB.status).toBe(201);
      const accountBId = createResB.body.account.id;

      // User A listing accounts sees ONLY Account A1
      asUser(USER_A);
      const listA = await invokeApi(listAccounts, new Request("http://localhost/api/accounts"), { DB: harness.db });
      expect(listA.status).toBe(200);
      expect(listA.body.accounts).toHaveLength(1);
      expect(listA.body.accounts[0].id).toBe(accountAId);

      // User A attempts to GET User B account -> 404
      const getForeign = await invokeApi(
        getAccount,
        new Request(`http://localhost/api/accounts/${accountBId}`),
        { DB: harness.db },
        { id: accountBId }
      );
      expect(getForeign.status).toBe(404);
      expect(getForeign.body).toEqual({ error: "Account not found." });

      // User A attempts to PUT User B account -> 404 and 0 rows changed
      const beforePut = harness.takeDatabaseSnapshot();
      const putForeign = await invokeApi(
        updateAccount,
        createJsonRequest(`http://localhost/api/accounts/${accountBId}`, "PUT", {
          name: "Hacked Account Name"
        }),
        { DB: harness.db },
        { id: accountBId }
      );
      expect(putForeign.status).toBe(404);
      const afterPut = harness.takeDatabaseSnapshot();
      harness.assertNoChangesForUser(beforePut, afterPut, USER_B);

      // User A attempts to DELETE User B account -> 404 and 0 rows changed
      const beforeDelete = harness.takeDatabaseSnapshot();
      const deleteForeign = await invokeApi(
        deleteAccount,
        new Request(`http://localhost/api/accounts/${accountBId}`, { method: "DELETE" }),
        { DB: harness.db },
        { id: accountBId }
      );
      expect(deleteForeign.status).toBe(404);
      const afterDelete = harness.takeDatabaseSnapshot();
      harness.assertNoChangesForUser(beforeDelete, afterDelete, USER_B);

      // User A attempts to POST balances to User B account -> 404 and 0 rows added
      const beforeBal = harness.takeDatabaseSnapshot();
      const postForeignBal = await invokeApi(
        createBalance,
        createJsonRequest(`http://localhost/api/accounts/${accountBId}/balances`, "POST", {
          balanceCents: 999999,
          balanceDate: "2026-09-14"
        }),
        { DB: harness.db },
        { id: accountBId }
      );
      expect(postForeignBal.status).toBe(404);
      const afterBal = harness.takeDatabaseSnapshot();
      harness.assertNoChangesForUser(beforeBal, afterBal, USER_B);

      // User A attempts to GET balances for User B account -> 404
      const getForeignBal = await invokeApi(
        getBalances,
        new Request(`http://localhost/api/accounts/${accountBId}/balances`),
        { DB: harness.db },
        { id: accountBId }
      );
      expect(getForeignBal.status).toBe(404);
    });
  });

  describe("3. Transactions & Cross-Tenant Account Reference Forgery", () => {
    it("rejects cross-tenant account ID reference when creating or updating transactions", async () => {
      // User A has Account A
      asUser(USER_A);
      const resA = await invokeApi(
        createAccount,
        createJsonRequest("http://localhost/api/accounts", "POST", {
          name: "Alice Checking",
          accountType: "checking",
          currency: "USD"
        }),
        { DB: harness.db }
      );
      const accountAId = resA.body.account.id;

      // User B has Account B
      asUser(USER_B);
      const resB = await invokeApi(
        createAccount,
        createJsonRequest("http://localhost/api/accounts", "POST", {
          name: "Bob Checking",
          accountType: "checking",
          currency: "EUR"
        }),
        { DB: harness.db }
      );
      const accountBId = resB.body.account.id;

      // User A tries to create a transaction referencing User B account
      asUser(USER_A);
      const beforeTx = harness.takeDatabaseSnapshot();
      const forgedTxRes = await invokeApi(
        createTransaction,
        createJsonRequest("http://localhost/api/transactions", "POST", {
          accountId: accountBId, // Cross-tenant forgery attempt!
          amountCents: 5000,
          description: "Illegal transfer",
          transactionDate: "2026-09-14",
          transactionType: "expense"
        }),
        { DB: harness.db }
      );
      expect(forgedTxRes.status).toBe(400);
      expect(forgedTxRes.body.error).toMatch(/accountId must reference an active owned account/i);

      // Database state proof: 0 transactions were written
      const afterTx = harness.takeDatabaseSnapshot();
      expect(afterTx.transactions).toHaveLength(0);
      harness.assertNoChangesForUser(beforeTx, afterTx, USER_B);

      // User A creates valid transaction for own account
      const validTxRes = await invokeApi(
        createTransaction,
        createJsonRequest("http://localhost/api/transactions", "POST", {
          accountId: accountAId,
          amountCents: 5000,
          description: "Groceries",
          transactionDate: "2026-09-14",
          transactionType: "expense"
        }),
        { DB: harness.db }
      );
      expect(validTxRes.status).toBe(201);
      const txAId = validTxRes.body.transaction.id;

      // User A attempts to update existing transaction to point to User B account
      const beforeUpdate = harness.takeDatabaseSnapshot();
      const updateForgedRes = await invokeApi(
        updateTransaction,
        createJsonRequest(`http://localhost/api/transactions/${txAId}`, "PUT", {
          accountId: accountBId // Forged update!
        }),
        { DB: harness.db },
        { id: txAId }
      );
      expect(updateForgedRes.status).toBe(404);
      expect(updateForgedRes.body.error).toMatch(/Transaction not found or accountId is not active and owned/i);
      const afterUpdate = harness.takeDatabaseSnapshot();
      expect(afterUpdate.transactions[0].account_id).toBe(accountAId); // Unchanged!
      harness.assertNoChangesForUser(beforeUpdate, afterUpdate, USER_B);

      // User B cannot access User A transaction
      asUser(USER_B);
      const getForeignTx = await invokeApi(
        getTransaction,
        new Request(`http://localhost/api/transactions/${txAId}`),
        { DB: harness.db },
        { id: txAId }
      );
      expect(getForeignTx.status).toBe(404);

      const deleteForeignTx = await invokeApi(
        deleteTransaction,
        new Request(`http://localhost/api/transactions/${txAId}`, { method: "DELETE" }),
        { DB: harness.db },
        { id: txAId }
      );
      expect(deleteForeignTx.status).toBe(404);
      expect(harness.getUserRows("transactions", USER_A)).toHaveLength(1);
    });
  });

  describe("4. Goals & Cross-Tenant Isolation", () => {
    it("denies access to foreign goals and prevents cross-tenant mutations", async () => {
      // User A creates Goal A1
      asUser(USER_A);
      const resGoalA = await invokeApi(
        createGoal,
        createJsonRequest("http://localhost/api/goals", "POST", {
          name: "Alice House Fund",
          goalType: "home",
          targetAmountCents: 10000000,
          currentAmountCents: 2000000,
          targetDate: "2030-01-01"
        }),
        { DB: harness.db }
      );
      expect(resGoalA.status).toBe(201);
      const goalAId = resGoalA.body.goal.id;

      // User B creates Goal B1
      asUser(USER_B);
      const resGoalB = await invokeApi(
        createGoal,
        createJsonRequest("http://localhost/api/goals", "POST", {
          name: "Bob Boat",
          goalType: "custom",
          targetAmountCents: 5000000,
          currentAmountCents: 500000,
          targetDate: "2029-06-01"
        }),
        { DB: harness.db }
      );
      expect(resGoalB.status).toBe(201);
      const goalBId = resGoalB.body.goal.id;

      // User A lists goals: sees only Goal A1
      asUser(USER_A);
      const listResA = await invokeApi(listGoals, new Request("http://localhost/api/goals"), { DB: harness.db });
      expect(listResA.body.goals).toHaveLength(1);
      expect(listResA.body.goals[0].id).toBe(goalAId);

      // User A tries to GET Goal B1 -> 404
      const getForeign = await invokeApi(
        getGoal,
        new Request(`http://localhost/api/goals/${goalBId}`),
        { DB: harness.db },
        { id: goalBId }
      );
      expect(getForeign.status).toBe(404);

      // User A tries to PUT Goal B1 -> 404, 0 rows modified
      const beforePut = harness.takeDatabaseSnapshot();
      const putForeign = await invokeApi(
        updateGoal,
        createJsonRequest(`http://localhost/api/goals/${goalBId}`, "PUT", {
          name: "Malicious Rename"
        }),
        { DB: harness.db },
        { id: goalBId }
      );
      expect(putForeign.status).toBe(404);
      const afterPut = harness.takeDatabaseSnapshot();
      harness.assertNoChangesForUser(beforePut, afterPut, USER_B);

      // User A tries to DELETE Goal B1 -> 404, User B goal remains active
      const beforeDel = harness.takeDatabaseSnapshot();
      const delForeign = await invokeApi(
        deleteGoal,
        new Request(`http://localhost/api/goals/${goalBId}`, { method: "DELETE" }),
        { DB: harness.db },
        { id: goalBId }
      );
      expect(delForeign.status).toBe(404);
      const afterDel = harness.takeDatabaseSnapshot();
      harness.assertNoChangesForUser(beforeDel, afterDel, USER_B);
    });
  });

  describe("5. Plans & Cross-Tenant Goal Reference Forgery", () => {
    it("rejects forged cross-tenant goal IDs when creating or updating plans", async () => {
      // User B creates a goal
      asUser(USER_B);
      const resGoalB = await invokeApi(
        createGoal,
        createJsonRequest("http://localhost/api/goals", "POST", {
          name: "Bob Target",
          goalType: "retirement",
          targetAmountCents: 200000000
        }),
        { DB: harness.db }
      );
      const goalBId = resGoalB.body.goal.id;

      // User A attempts to create a plan referencing User B goal
      asUser(USER_A);
      const beforePlan = harness.takeDatabaseSnapshot();
      const forgedPlanRes = await invokeApi(
        createPlan,
        createJsonRequest("http://localhost/api/plans", "POST", {
          name: "Alice Plan with Foreign Goal",
          goalId: goalBId, // Cross-tenant forgery!
          snapshot: {
            plan: { currentAge: 30, annualSpendingCents: 4000000 },
            timeline: { retirementAge: 60 }
          },
          result: {
            fireNumberCents: 100000000
          }
        }),
        { DB: harness.db }
      );
      expect(forgedPlanRes.status).toBe(400);
      expect(forgedPlanRes.body.error).toMatch(/unavailable/i);

      // Verify zero plan rows created
      const afterPlan = harness.takeDatabaseSnapshot();
      expect(afterPlan.plans).toHaveLength(0);
      expect(afterPlan.plan_versions).toHaveLength(0);
      harness.assertNoChangesForUser(beforePlan, afterPlan, USER_B);

      // User A creates valid plan without foreign goal
      const validPlanRes = await invokeApi(
        createPlan,
        createJsonRequest("http://localhost/api/plans", "POST", {
          name: "Alice FIRE Plan",
          snapshot: {
            plan: { currentAge: 30 },
            timeline: { retirementAge: 50 }
          },
          result: { fireNumberCents: 125000000 }
        }),
        { DB: harness.db }
      );
      expect(validPlanRes.status).toBe(201);
      const planAId = validPlanRes.body.plan.id;

      // User A tries to update plan to reference User B goal
      const updateForgedPlanRes = await invokeApi(
        updatePlan,
        createJsonRequest(`http://localhost/api/plans/${planAId}`, "PUT", {
          goalId: goalBId
        }),
        { DB: harness.db },
        { id: planAId }
      );
      expect(updateForgedPlanRes.status).toBe(400);

      // User B cannot access User A plan or versions
      asUser(USER_B);
      const foreignGet = await invokeApi(getPlan, new Request(`http://localhost/api/plans/${planAId}`), { DB: harness.db }, { id: planAId });
      expect(foreignGet.status).toBe(404);

      const foreignVersionList = await invokeApi(listPlanVersions, new Request(`http://localhost/api/plans/${planAId}/versions`), { DB: harness.db }, { id: planAId });
      expect(foreignVersionList.status).toBe(404);

      const foreignVersionGet = await invokeApi(getPlanVersion, new Request(`http://localhost/api/plans/${planAId}/versions/1`), { DB: harness.db }, { id: planAId, versionNumber: "1" });
      expect(foreignVersionGet.status).toBe(404);

      const foreignVersionPut = await invokeApi(
        updatePlan,
        createJsonRequest(`http://localhost/api/plans/${planAId}`, "PUT", {
          name: "Alice FIRE Plan Updated",
          snapshot: {
            plan: { currentAge: 31 },
            timeline: { retirementAge: 50 }
          },
          result: { fireNumberCents: 130000000 }
        }),
        { DB: harness.db },
        { id: planAId }
      );
      expect(foreignVersionPut.status).toBe(404);

      const foreignDelete = await invokeApi(deletePlan, new Request(`http://localhost/api/plans/${planAId}`, { method: "DELETE" }), { DB: harness.db }, { id: planAId });
      expect(foreignDelete.status).toBe(404);
      expect(harness.getUserRows("plans", USER_A)).toHaveLength(1);
    });
  });

  describe("6. Calculator Results & B04 Per-Tenant Idempotency", () => {
    it("ensures idempotency keys are strictly isolated per tenant and handles replay/conflict", async () => {
      const payloadA = {
        calculatorCategory: "Planning",
        calculatorRegion: "Global",
        calculatorSlug: "savings-goal",
        calculatorTitle: "Savings Goal Calculator",
        conversionLabel: "Create savings goal",
        conversionRoute: "/goals",
        currency: "USD",
        idempotencyKey: "shared-key-123",
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
      };

      const payloadB = {
        ...payloadA,
        idempotencyKey: "shared-key-123" // IDENTICAL KEY!
      };

      // User A saves result with key "shared-key-123"
      asUser(USER_A);
      const resA1 = await invokeApi(
        saveCalculatorResult,
        createJsonRequest("http://localhost/api/calculator-results", "POST", payloadA),
        { DB: harness.db }
      );
      expect(resA1.status).toBe(201);
      expect(resA1.body.savedResult.idempotencyKey).toBe("shared-key-123");

      // User B saves result with SAME key "shared-key-123" -> succeeds without collision!
      asUser(USER_B);
      const resB1 = await invokeApi(
        saveCalculatorResult,
        createJsonRequest("http://localhost/api/calculator-results", "POST", payloadB),
        { DB: harness.db }
      );
      expect(resB1.status).toBe(201);
      expect(resB1.body.savedResult.idempotencyKey).toBe("shared-key-123");

      // User A replays identical payload with same key -> 200 RETRY (B04 contract)
      asUser(USER_A);
      const resAReplay = await invokeApi(
        saveCalculatorResult,
        createJsonRequest("http://localhost/api/calculator-results", "POST", payloadA),
        { DB: harness.db }
      );
      expect(resAReplay.status).toBe(200);
      expect(resAReplay.body.savedResult.id).toBe(resA1.body.savedResult.id);

      // User A submits different payload with same key -> 409 Conflict
      const conflictingPayloadA = {
        ...payloadA,
        inputValues: {
          ...payloadA.inputValues,
          target: 99999 // Different target!
        }
      };
      const resAConflict = await invokeApi(
        saveCalculatorResult,
        createJsonRequest("http://localhost/api/calculator-results", "POST", conflictingPayloadA),
        { DB: harness.db }
      );
      expect(resAConflict.status).toBe(409);
      expect(resAConflict.body.error).toMatch(/Idempotency key was previously used/i);

      // User A lists calculator results: sees only User A result
      const listA = await invokeApi(listCalculatorResults, new Request("http://localhost/api/calculator-results"), { DB: harness.db });
      expect(listA.body.calculatorResults).toHaveLength(1);
      expect(listA.body.calculatorResults[0].id).toBe(resA1.body.savedResult.id);
    });
  });

  describe("7. Imports Tenancy (Balance & Transaction)", () => {
    it("prevents importing into foreign accounts and isolates import histories", async () => {
      // User B has Account B
      asUser(USER_B);
      const resB = await invokeApi(
        createAccount,
        createJsonRequest("http://localhost/api/accounts", "POST", {
          name: "Bob Vault",
          accountType: "savings",
          currency: "EUR"
        }),
        { DB: harness.db }
      );
      const accountBId = resB.body.account.id;

      // User A attempts to preview balance import targeting Bob Vault
      asUser(USER_A);
      const previewRes = await invokeApi(
        previewBalanceImport,
        createJsonRequest("http://localhost/api/imports/account-balances/preview", "POST", {
          fileName: "test_balances.csv",
          rows: [
            { rowNumber: 2, account: accountBId, balanceDate: "2026-09-14", balance: "1000.00", currency: "EUR" }
          ]
        }),
        { DB: harness.db }
      );
      expect(previewRes.status).toBe(200);
      expect(previewRes.body.preview.summary.readyRows).toBe(0);
      expect(previewRes.body.preview.summary.errorRows).toBe(1);
      expect(previewRes.body.preview.rows[0].message).toMatch(/No active account matches this value/i);

      // User A commits balance import for own account
      const resA = await invokeApi(
        createAccount,
        createJsonRequest("http://localhost/api/accounts", "POST", {
          name: "Alice Vault",
          accountType: "savings",
          currency: "USD"
        }),
        { DB: harness.db }
      );
      const accountAId = resA.body.account.id;

      const commitRes = await invokeApi(
        commitBalanceImport,
        createJsonRequest("http://localhost/api/imports/account-balances/commit", "POST", {
          fileName: "alice_balances.csv",
          sourceHash: "hash_alice_1",
          rows: [
            { rowNumber: 2, account: accountAId, balanceDate: "2026-09-14", balance: "5000.00", currency: "USD" }
          ]
        }),
        { DB: harness.db }
      );
      expect(commitRes.status).toBe(201);
      expect(commitRes.body.importRecord.importedRows).toBe(1);

      // User B listing balance imports sees 0 records
      asUser(USER_B);
      const listB = await invokeApi(listBalanceImports, new Request("http://localhost/api/imports/account-balances"), { DB: harness.db });
      expect(listB.body.imports).toHaveLength(0);

      // User A sees 1 import record
      asUser(USER_A);
      const listA = await invokeApi(listBalanceImports, new Request("http://localhost/api/imports/account-balances"), { DB: harness.db });
      expect(listA.body.imports).toHaveLength(1);
    });
  });

  describe("8. Account Data Export & Deletion Isolation", () => {
    it("exports strictly own tenant data and guarantees deletion leaves other tenants untouched", async () => {
      // Seed data for User A: account, goal, plan
      asUser(USER_A);
      const accA = await invokeApi(
        createAccount,
        createJsonRequest("http://localhost/api/accounts", "POST", { name: "A Checking", accountType: "checking", currency: "USD" }),
        { DB: harness.db }
      );
      const goalA = await invokeApi(
        createGoal,
        createJsonRequest("http://localhost/api/goals", "POST", { name: "A Goal", goalType: "emergency_fund", targetAmountCents: 500000 }),
        { DB: harness.db }
      );
      await invokeApi(
        createPlan,
        createJsonRequest("http://localhost/api/plans", "POST", {
          name: "A Plan",
          snapshot: { plan: { age: 30 }, timeline: { retirementAge: 60 } },
          result: { fireNumberCents: 100000000 }
        }),
        { DB: harness.db }
      );

      // Seed data for User B: account, goal
      asUser(USER_B);
      const accB = await invokeApi(
        createAccount,
        createJsonRequest("http://localhost/api/accounts", "POST", { name: "B Checking", accountType: "checking", currency: "EUR" }),
        { DB: harness.db }
      );
      const goalB = await invokeApi(
        createGoal,
        createJsonRequest("http://localhost/api/goals", "POST", { name: "B Goal", goalType: "travel", targetAmountCents: 200000 }),
        { DB: harness.db }
      );

      // User A exports account data
      asUser(USER_A);
      const exportRes = await invokeApi(exportAccountData, new Request("http://localhost/api/account-data/export"), { DB: harness.db });
      expect(exportRes.status).toBe(200);
      const exported = exportRes.body.export;

      // Verify User A data is present
      expect(exported.data.financialAccounts.some((a: any) => a.id === accA.body.account.id)).toBe(true);
      expect(exported.data.goals.some((g: any) => g.id === goalA.body.goal.id)).toBe(true);

      // Verify ZERO User B rows exist in export
      expect(exported.data.financialAccounts.some((a: any) => a.id === accB.body.account.id)).toBe(false);
      expect(exported.data.goals.some((g: any) => g.id === goalB.body.goal.id)).toBe(false);
      expect(exported.subject.userId).toBe(USER_A);

      // Capture before snapshot for User B
      const beforeSnapshot = harness.takeDatabaseSnapshot();

      // User A deletes all account data with required confirmation
      const deleteRes = await invokeApi(
        deleteAccountData,
        createJsonRequest("http://localhost/api/account-data", "DELETE", { confirmation: "DELETE MY FINPATH DATA" }),
        { DB: harness.db }
      );
      expect(deleteRes.status).toBe(200);

      // Database state comparison: User B has ZERO modifications
      const afterSnapshot = harness.takeDatabaseSnapshot();
      harness.assertNoChangesForUser(beforeSnapshot, afterSnapshot, USER_B);

      // Confirm User B can still access their accounts and goals
      asUser(USER_B);
      const listAccB = await invokeApi(listAccounts, new Request("http://localhost/api/accounts"), { DB: harness.db });
      expect(listAccB.body.accounts).toHaveLength(1);
      expect(listAccB.body.accounts[0].id).toBe(accB.body.account.id);

      const listGoalB = await invokeApi(listGoals, new Request("http://localhost/api/goals"), { DB: harness.db });
      expect(listGoalB.body.goals).toHaveLength(1);
      expect(listGoalB.body.goals[0].id).toBe(goalB.body.goal.id);
    });
  });

  describe("9. Dashboard Aggregation Isolation", () => {
    it("aggregates exclusively own financial totals on the dashboard", async () => {
      // User A has 10,000 USD
      asUser(USER_A);
      const accA = await invokeApi(
        createAccount,
        createJsonRequest("http://localhost/api/accounts", "POST", { name: "Alice Account", accountType: "checking", currency: "USD" }),
        { DB: harness.db }
      );
      await invokeApi(
        createBalance,
        createJsonRequest(`http://localhost/api/accounts/${accA.body.account.id}/balances`, "POST", {
          balanceCents: 1000000, // $10,000
          balanceDate: "2026-09-14"
        }),
        { DB: harness.db },
        { id: accA.body.account.id }
      );

      // User B has 999,999 EUR
      asUser(USER_B);
      const accB = await invokeApi(
        createAccount,
        createJsonRequest("http://localhost/api/accounts", "POST", { name: "Bob Account", accountType: "investment", currency: "EUR" }),
        { DB: harness.db }
      );
      await invokeApi(
        createBalance,
        createJsonRequest(`http://localhost/api/accounts/${accB.body.account.id}/balances`, "POST", {
          balanceCents: 99999900, // 999,999 EUR
          balanceDate: "2026-09-14"
        }),
        { DB: harness.db },
        { id: accB.body.account.id }
      );

      // User A loads dashboard
      asUser(USER_A);
      const dashA = await invokeApi(getDashboard, new Request("http://localhost/api/dashboard"), { DB: harness.db });
      expect(dashA.status).toBe(200);
      expect(dashA.body.dashboard.summary.netWorthCents).toBe(1000000);
      expect(dashA.body.dashboard.summary.accountCount).toBe(1);
      expect(dashA.body.dashboard.summary.currencies).toEqual(["USD"]);
      expect(dashA.body.dashboard.recentAccounts).toHaveLength(1);
      expect(dashA.body.dashboard.recentAccounts[0].id).toBe(accA.body.account.id);
    });
  });

  describe("10. Malformed, Negative & Oversized Payloads", () => {
    it("rejects invalid JSON, negative amounts, and oversized payloads before persistence", async () => {
      asUser(USER_A);

      // Non-JSON / invalid body
      const invalidJsonReq = new Request("http://localhost/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{ malformed json: true "
      });
      const invalidRes = await invokeApi(createAccount, invalidJsonReq, { DB: harness.db });
      expect(invalidRes.status).toBe(400);

      // Negative amount cents in goal
      const negGoalRes = await invokeApi(
        createGoal,
        createJsonRequest("http://localhost/api/goals", "POST", {
          name: "Invalid Goal",
          goalType: "savings_goal",
          targetAmountCents: -500
        }),
        { DB: harness.db }
      );
      expect(negGoalRes.status).toBe(400);

      // Invalid currency code
      const invalidCurrRes = await invokeApi(
        createAccount,
        createJsonRequest("http://localhost/api/accounts", "POST", {
          name: "Invalid Currency",
          accountType: "checking",
          currency: "TOOLONG"
        }),
        { DB: harness.db }
      );
      expect(invalidCurrRes.status).toBe(400);

      // Oversized body (>200KB junk)
      const hugeName = "A".repeat(250_000);
      const hugeReq = createJsonRequest("http://localhost/api/accounts", "POST", {
        name: hugeName,
        accountType: "checking",
        currency: "USD"
      });
      const hugeRes = await invokeApi(createAccount, hugeReq, { DB: harness.db });
      expect(hugeRes.status).toBe(400);

      // Assert 0 rows were added for User A during these rejected requests
      expect(harness.getUserRows("financial_accounts", USER_A)).toHaveLength(0);
      expect(harness.getUserRows("goals", USER_A)).toHaveLength(0);
    });
  });
});
