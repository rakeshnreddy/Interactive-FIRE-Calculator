/// <reference types="@cloudflare/workers-types" />

import { readAccount, type AccountCreatePayload, type FinancialAccount } from './accounts';
import { readGoal, type Goal, type GoalCreatePayload } from './goals';
import { ensureUserProfile } from './persistence';

type JsonRecord = Record<string, unknown>;

export const calculatorDestinationTypes = ['goal', 'account', 'plan', 'transaction'] as const;
export const calculatorCreatedEntityTypes = ['goal', 'account', 'plan', 'transaction'] as const;

export type CalculatorDestinationType = (typeof calculatorDestinationTypes)[number];
export type CalculatorCreatedEntityType = (typeof calculatorCreatedEntityTypes)[number];

export type CalculatorMetricSnapshot = {
  description?: string;
  label: string;
  tone?: string;
  value: number;
  valueType: 'currency' | 'number' | 'percent' | 'years';
};

export type CalculatorResultSnapshot = {
  assumptions: readonly string[];
  metrics: readonly CalculatorMetricSnapshot[];
  narrative: string;
};

export type CalculatorSavePayload = {
  calculatorCategory: string;
  calculatorRegion: string;
  calculatorSlug: string;
  calculatorTitle: string;
  conversionLabel: string;
  conversionRoute: '/accounts' | '/goals' | '/plans' | '/transactions';
  currency: string;
  idempotencyKey?: string | null;
  inputValues: Record<string, number>;
  result: CalculatorResultSnapshot;
};

export type SavedCalculatorResult = {
  calculatorCategory: string;
  calculatorRegion: string;
  calculatorSlug: string;
  calculatorTitle: string;
  conversionLabel: string;
  conversionRoute: CalculatorSavePayload['conversionRoute'];
  createdAt: string;
  createdEntityId: string | null;
  createdEntityType: CalculatorCreatedEntityType | null;
  currency: string;
  destinationType: CalculatorDestinationType;
  id: string;
  idempotencyKey: string | null;
  inputValues: Record<string, number>;
  payloadHash?: string | null;
  result: CalculatorResultSnapshot;
  updatedAt: string;
};

export type CalculatorSaveCreatedEntity =
  | { entity: Goal; id: string; route: '/goals'; type: 'goal' }
  | { entity: FinancialAccount; id: string; route: '/accounts'; type: 'account' }
  | { entity: SavedCalculatorPlanDraft; id: string; route: '/plans'; type: 'plan' }
  | null;

export type SavedCalculatorPlanDraft = {
  createdAt: string;
  id: string;
  name: string;
  planType: 'debt_payoff' | 'retirement_income' | 'savings_goal' | 'custom';
  status: 'draft' | 'active' | 'archived';
  updatedAt: string;
};

export const CALCULATOR_SAVE_STATUS = {
  COMMITTED: 'committed-save',
  RETRY: 'retry',
  CONFLICT: 'conflict'
} as const;

export type CalculatorSaveStatus = (typeof CALCULATOR_SAVE_STATUS)[keyof typeof CALCULATOR_SAVE_STATUS];

export type CalculatorSaveResult = {
  createdEntity: CalculatorSaveCreatedEntity;
  savedResult: SavedCalculatorResult;
  saveStatus: 'committed-save' | 'retry';
};

export const IDEMPOTENCY_CONFLICT_CODE = 'IDEMPOTENCY_CONFLICT';
export const IDEMPOTENCY_CONFLICT_MESSAGE =
  'Idempotency key was previously used with a different calculator payload.';

export class IdempotencyConflictError extends Error {
  readonly code = IDEMPOTENCY_CONFLICT_CODE;
  readonly status = 409;

  constructor(message = IDEMPOTENCY_CONFLICT_MESSAGE) {
    super(message);
    this.name = 'IdempotencyConflictError';
  }
}

export const IDEMPOTENCY_KEY_MISMATCH_CODE = 'IDEMPOTENCY_KEY_MISMATCH';
export const IDEMPOTENCY_KEY_MISMATCH_MESSAGE =
  'Idempotency-Key header and request body idempotencyKey do not match.';

export type ParseCalculatorSavePayloadOptions = {
  idempotencyHeader?: string | null;
};

type SavedCalculatorResultRow = {
  calculator_category: string;
  calculator_region: string;
  calculator_slug: string;
  calculator_title: string;
  conversion_label: string;
  conversion_route: CalculatorSavePayload['conversionRoute'];
  created_at: string;
  created_entity_id: string | null;
  created_entity_type: CalculatorCreatedEntityType | null;
  currency: string;
  destination_type: CalculatorDestinationType;
  id: string;
  idempotency_key?: string | null;
  input_json: string;
  payload_hash?: string | null;
  result_json: string;
  updated_at: string;
};

const maxTextLength = 160;
const maxMoneyCents = 99_999_999_999_999;

export async function listSavedCalculatorResults(
  database: D1Database,
  userId: string,
  limit = 12
): Promise<SavedCalculatorResult[]> {
  await ensureUserProfile(database, userId);

  const result = await database
    .prepare(
      `
        SELECT
          id,
          calculator_slug,
          calculator_title,
          calculator_category,
          calculator_region,
          currency,
          destination_type,
          conversion_route,
          conversion_label,
          input_json,
          result_json,
          created_entity_type,
          created_entity_id,
          idempotency_key,
          payload_hash,
          created_at,
          updated_at
        FROM saved_calculator_results
        WHERE user_id = ?
        ORDER BY created_at DESC, id DESC
        LIMIT ?
      `
    )
    .bind(userId, Math.max(1, Math.min(Math.trunc(limit), 50)))
    .all<SavedCalculatorResultRow>();

  return result.results.map(toSavedCalculatorResult);
}

export const INCOMPATIBLE_GOAL_CURRENCY_CODE = 'INCOMPATIBLE_GOAL_CURRENCY';
export const INCOMPATIBLE_GOAL_CURRENCY_MESSAGE =
  'Goals currently support USD only. Currency conversion into goals is not supported.';

export class IncompatibleGoalCurrencyError extends Error {
  readonly code = INCOMPATIBLE_GOAL_CURRENCY_CODE;

  constructor(message = INCOMPATIBLE_GOAL_CURRENCY_MESSAGE) {
    super(message);
    this.name = 'IncompatibleGoalCurrencyError';
  }
}

export async function createSavedCalculatorResult(
  database: D1Database,
  userId: string,
  payload: CalculatorSavePayload
): Promise<CalculatorSaveResult> {
  const destinationType = destinationTypeForRoute(payload.conversionRoute);

  if (destinationType === 'goal' && payload.currency !== 'USD') {
    throw new IncompatibleGoalCurrencyError();
  }

  await ensureUserProfile(database, userId);

  const payloadHash = await hashCalculatorPayload(payload);
  const normalizedKey = payload.idempotencyKey?.trim() || null;

  if (normalizedKey) {
    const existing = await database
      .prepare(
        `
          SELECT
            id,
            calculator_slug,
            calculator_title,
            calculator_category,
            calculator_region,
            currency,
            destination_type,
            conversion_route,
            conversion_label,
            input_json,
            result_json,
            created_entity_type,
            created_entity_id,
            idempotency_key,
            payload_hash,
            created_at,
            updated_at
          FROM saved_calculator_results
          WHERE user_id = ?
            AND idempotency_key = ?
        `
      )
      .bind(userId, normalizedKey)
      .first<SavedCalculatorResultRow>();

    if (existing) {
      if (existing.payload_hash === payloadHash) {
        const createdEntity = await readDestinationEntity(
          database,
          userId,
          existing.created_entity_type,
          existing.created_entity_id,
          existing.conversion_route
        );
        return {
          createdEntity,
          savedResult: toSavedCalculatorResult(existing),
          saveStatus: CALCULATOR_SAVE_STATUS.RETRY
        };
      }
      throw new IdempotencyConflictError();
    }
  }

  const now = new Date().toISOString();
  const destinationStatements: D1PreparedStatement[] = [];
  let createdEntityInfo: {
    id: string;
    route: '/accounts' | '/goals' | '/plans';
    type: CalculatorCreatedEntityType;
  } | null = null;

  if (destinationType === 'goal') {
    const goalPayload = goalPayloadFromCalculator(payload);
    if (goalPayload) {
      const goalId = crypto.randomUUID();
      createdEntityInfo = { id: goalId, route: '/goals', type: 'goal' };
      destinationStatements.push(
        database
          .prepare(
            `
              INSERT INTO goals (
                id,
                user_id,
                name,
                goal_type,
                target_amount_cents,
                current_amount_cents,
                target_date,
                status,
                created_at,
                updated_at
              )
              VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
            `
          )
          .bind(
            goalId,
            userId,
            goalPayload.name,
            goalPayload.goalType,
            goalPayload.targetAmountCents,
            goalPayload.currentAmountCents,
            goalPayload.targetDate,
            now,
            now
          )
      );
    }
  } else if (destinationType === 'account') {
    const accountPayload = accountPayloadFromCalculator(payload);
    if (accountPayload) {
      const accountId = crypto.randomUUID();
      createdEntityInfo = { id: accountId, route: '/accounts', type: 'account' };
      destinationStatements.push(
        database
          .prepare(
            `
              INSERT INTO financial_accounts (
                id,
                user_id,
                name,
                account_type,
                institution_name,
                currency,
                is_active,
                created_at,
                updated_at
              )
              VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
            `
          )
          .bind(
            accountId,
            userId,
            accountPayload.name,
            accountPayload.accountType,
            accountPayload.institutionName,
            accountPayload.currency,
            now,
            now
          )
      );

      if (accountPayload.balanceCents !== undefined) {
        destinationStatements.push(
          database
            .prepare(
              `
                INSERT INTO account_balances (id, account_id, user_id, balance_date, balance_cents, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
              `
            )
            .bind(
              crypto.randomUUID(),
              accountId,
              userId,
              accountPayload.balanceDate ?? todayDate(),
              accountPayload.balanceCents,
              now
            )
        );
      }
    }
  } else if (destinationType === 'plan') {
    const planId = crypto.randomUUID();
    const planType = planTypeForCalculator(payload.calculatorSlug, payload.calculatorTitle);
    const planName = truncateText(`${payload.calculatorTitle} draft`, 120);
    createdEntityInfo = { id: planId, route: '/plans', type: 'plan' };
    destinationStatements.push(
      database
        .prepare(
          `
            INSERT INTO plans (id, user_id, goal_id, name, plan_type, status, created_at, updated_at)
            VALUES (?, ?, NULL, ?, ?, 'draft', ?, ?)
          `
        )
        .bind(planId, userId, planName, planType, now, now)
    );
  }

  const savedResultId = crypto.randomUUID();
  const savedResultStatement = database
    .prepare(
      `
        INSERT INTO saved_calculator_results (
          id,
          user_id,
          calculator_slug,
          calculator_title,
          calculator_category,
          calculator_region,
          currency,
          destination_type,
          conversion_route,
          conversion_label,
          input_json,
          result_json,
          created_entity_type,
          created_entity_id,
          idempotency_key,
          payload_hash,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    )
    .bind(
      savedResultId,
      userId,
      payload.calculatorSlug,
      payload.calculatorTitle,
      payload.calculatorCategory,
      payload.calculatorRegion,
      payload.currency,
      destinationType,
      payload.conversionRoute,
      payload.conversionLabel,
      JSON.stringify(payload.inputValues),
      JSON.stringify(payload.result),
      createdEntityInfo?.type ?? null,
      createdEntityInfo?.id ?? null,
      normalizedKey,
      payloadHash,
      now,
      now
    );

  const batchStatements = [...destinationStatements, savedResultStatement];

  try {
    await database.batch(batchStatements);
  } catch (error) {
    if (normalizedKey && isUniqueConstraintError(error)) {
      const existing = await database
        .prepare(
          `
            SELECT
              id,
              calculator_slug,
              calculator_title,
              calculator_category,
              calculator_region,
              currency,
              destination_type,
              conversion_route,
              conversion_label,
              input_json,
              result_json,
              created_entity_type,
              created_entity_id,
              idempotency_key,
              payload_hash,
              created_at,
              updated_at
            FROM saved_calculator_results
            WHERE user_id = ?
              AND idempotency_key = ?
          `
        )
        .bind(userId, normalizedKey)
        .first<SavedCalculatorResultRow>();

      if (existing) {
        if (existing.payload_hash === payloadHash) {
          const createdEntity = await readDestinationEntity(
            database,
            userId,
            existing.created_entity_type,
            existing.created_entity_id,
            existing.conversion_route
          );
          return {
            createdEntity,
            savedResult: toSavedCalculatorResult(existing),
            saveStatus: CALCULATOR_SAVE_STATUS.RETRY
          };
        }
        throw new IdempotencyConflictError();
      }
    }
    throw error;
  }

  const savedResult = await readSavedCalculatorResult(database, userId, savedResultId);

  if (!savedResult) {
    throw new Error('Failed to save calculator result.');
  }

  const createdEntity = createdEntityInfo
    ? await readDestinationEntity(
        database,
        userId,
        createdEntityInfo.type,
        createdEntityInfo.id,
        createdEntityInfo.route
      )
    : null;

  return {
    createdEntity,
    savedResult,
    saveStatus: CALCULATOR_SAVE_STATUS.COMMITTED
  };
}

export async function readSavedCalculatorResult(
  database: D1Database,
  userId: string,
  savedResultId: string
): Promise<SavedCalculatorResult | null> {
  await ensureUserProfile(database, userId);

  const row = await database
    .prepare(
      `
        SELECT
          id,
          calculator_slug,
          calculator_title,
          calculator_category,
          calculator_region,
          currency,
          destination_type,
          conversion_route,
          conversion_label,
          input_json,
          result_json,
          created_entity_type,
          created_entity_id,
          idempotency_key,
          payload_hash,
          created_at,
          updated_at
        FROM saved_calculator_results
        WHERE id = ?
          AND user_id = ?
      `
    )
    .bind(savedResultId, userId)
    .first<SavedCalculatorResultRow>();

  return row ? toSavedCalculatorResult(row) : null;
}

export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export type CalculatorSaveParseError = {
  code?: string;
  error: string;
  ok: false;
};

export function parseCalculatorSavePayload(
  value: unknown,
  options?: ParseCalculatorSavePayloadOptions
):
  | { ok: true; value: CalculatorSavePayload }
  | CalculatorSaveParseError {
  if (!isRecord(value)) {
    return { error: 'Request body must be a JSON object.', ok: false };
  }

  const calculatorSlug = parseRequiredSlug(value.calculatorSlug, 'calculatorSlug');
  if (!calculatorSlug.ok) return calculatorSlug;

  const calculatorTitle = parseRequiredText(value.calculatorTitle, 'calculatorTitle', maxTextLength);
  if (!calculatorTitle.ok) return calculatorTitle;

  const calculatorCategory = parseRequiredText(value.calculatorCategory, 'calculatorCategory', 80);
  if (!calculatorCategory.ok) return calculatorCategory;

  const calculatorRegion = parseRequiredText(value.calculatorRegion, 'calculatorRegion', 40);
  if (!calculatorRegion.ok) return calculatorRegion;

  const conversionLabel = parseRequiredText(value.conversionLabel, 'conversionLabel', 120);
  if (!conversionLabel.ok) return conversionLabel;

  const conversionRoute = parseConversionRoute(value.conversionRoute);
  if (!conversionRoute.ok) return conversionRoute;

  const currency = parseCurrency(value.currency);
  if (!currency.ok) return currency;

  if (conversionRoute.value === '/goals' && currency.value !== 'USD') {
    return {
      code: INCOMPATIBLE_GOAL_CURRENCY_CODE,
      error: INCOMPATIBLE_GOAL_CURRENCY_MESSAGE,
      ok: false
    };
  }

  const idempotencyKey = resolveIdempotencyKey(value.idempotencyKey, options?.idempotencyHeader);
  if (!idempotencyKey.ok) return idempotencyKey;

  const inputValues = parseInputValues(value.inputValues);
  if (!inputValues.ok) return inputValues;

  const result = parseCalculatorResult(value.result);
  if (!result.ok) return result;

  const parsedValue: CalculatorSavePayload = {
    calculatorCategory: calculatorCategory.value,
    calculatorRegion: calculatorRegion.value,
    calculatorSlug: calculatorSlug.value,
    calculatorTitle: calculatorTitle.value,
    conversionLabel: conversionLabel.value,
    conversionRoute: conversionRoute.value,
    currency: currency.value,
    inputValues: inputValues.value,
    result: result.value
  };

  if (idempotencyKey.value !== undefined) {
    parsedValue.idempotencyKey = idempotencyKey.value;
  }

  return {
    ok: true,
    value: parsedValue
  };
}

export function destinationTypeForRoute(route: CalculatorSavePayload['conversionRoute']): CalculatorDestinationType {
  if (route === '/goals') return 'goal';
  if (route === '/accounts') return 'account';
  if (route === '/plans') return 'plan';
  return 'transaction';
}

export async function readPlanDraft(
  database: D1Database,
  userId: string,
  planId: string
): Promise<SavedCalculatorPlanDraft | null> {
  await ensureUserProfile(database, userId);

  const row = await database
    .prepare(
      `
        SELECT
          id,
          name,
          plan_type,
          status,
          created_at,
          updated_at
        FROM plans
        WHERE id = ? AND user_id = ?
      `
    )
    .bind(planId, userId)
    .first<{
      created_at: string;
      id: string;
      name: string;
      plan_type: SavedCalculatorPlanDraft['planType'];
      status: SavedCalculatorPlanDraft['status'];
      updated_at: string;
    }>();

  if (!row) {
    return null;
  }

  return {
    createdAt: row.created_at,
    id: row.id,
    name: row.name,
    planType: row.plan_type,
    status: row.status,
    updatedAt: row.updated_at
  };
}

export async function readDestinationEntity(
  database: D1Database,
  userId: string,
  type: CalculatorCreatedEntityType | null,
  id: string | null,
  route: CalculatorSavePayload['conversionRoute']
): Promise<CalculatorSaveCreatedEntity> {
  if (!type || !id) {
    return null;
  }

  if (type === 'goal') {
    const goal = await readGoal(database, userId, id);
    return goal ? { entity: goal, id: goal.id, route: '/goals', type: 'goal' } : null;
  }

  if (type === 'account') {
    const account = await readAccount(database, userId, id);
    return account ? { entity: account, id: account.id, route: '/accounts', type: 'account' } : null;
  }

  if (type === 'plan') {
    const plan = await readPlanDraft(database, userId, id);
    return plan ? { entity: plan, id: plan.id, route: '/plans', type: 'plan' } : null;
  }

  return null;
}

export function goalPayloadFromCalculator(payload: CalculatorSavePayload): GoalCreatePayload | null {
  if (payload.currency !== 'USD') {
    return null;
  }

  const targetAmountCents = targetAmountCentsForGoal(payload);

  if (targetAmountCents === null || targetAmountCents <= 0) {
    return null;
  }

  return {
    currentAmountCents: Math.min(currentAmountCentsForGoal(payload), targetAmountCents),
    goalType: goalTypeForCalculator(payload.calculatorSlug),
    name: truncateText(`${payload.calculatorTitle} result`, 120),
    targetAmountCents,
    targetDate: targetDateForYears(inputNumber(payload, 'years'))
  };
}

function accountPayloadFromCalculator(payload: CalculatorSavePayload): AccountCreatePayload | null {
  const accountType = accountTypeForCalculator(payload.calculatorSlug, payload.calculatorTitle);
  const balanceCents = accountBalanceCentsForCalculator(payload, accountType);

  if (balanceCents === null) {
    return null;
  }

  return {
    accountType,
    balanceCents,
    balanceDate: todayDate(),
    currency: payload.currency,
    institutionName: 'Saved calculator result',
    name: truncateText(`${payload.calculatorTitle} draft`, 120)
  };
}

async function createPlanDraft(
  database: D1Database,
  userId: string,
  payload: CalculatorSavePayload
): Promise<SavedCalculatorPlanDraft> {
  const planId = crypto.randomUUID();
  const now = new Date().toISOString();
  const planType = planTypeForCalculator(payload.calculatorSlug, payload.calculatorTitle);

  await database
    .prepare(
      `
        INSERT INTO plans (id, user_id, goal_id, name, plan_type, status, created_at, updated_at)
        VALUES (?, ?, NULL, ?, ?, 'draft', ?, ?)
      `
    )
    .bind(planId, userId, truncateText(`${payload.calculatorTitle} draft`, 120), planType, now, now)
    .run();

  return {
    createdAt: now,
    id: planId,
    name: truncateText(`${payload.calculatorTitle} draft`, 120),
    planType,
    status: 'draft',
    updatedAt: now
  };
}

function targetAmountCentsForGoal(payload: CalculatorSavePayload): number | null {
  if (payload.calculatorSlug === 'down-payment') {
    const homePrice = inputNumber(payload, 'homePrice');
    const downPercent = inputNumber(payload, 'downPercent');
    if (homePrice !== null && downPercent !== null) return toCents(homePrice * downPercent / 100);
  }

  if (payload.calculatorSlug === 'savings-goal') {
    const resolvedTarget = inputNumber(payload, 'resolvedTarget');
    if (resolvedTarget !== null && resolvedTarget > 0) return toCents(resolvedTarget);
  }

  const directTarget = firstInputNumber(payload, ['target', 'goal', 'homePrice']);
  if (directTarget !== null && directTarget > 0) return toCents(directTarget);

  return firstCurrencyMetricCents(payload);
}

function currentAmountCentsForGoal(payload: CalculatorSavePayload): number {
  const directCurrent = firstInputNumber(payload, ['current', 'currentSavings', 'principal', 'savings']);
  return directCurrent === null ? 0 : Math.max(0, toCents(directCurrent));
}

function accountBalanceCentsForCalculator(
  payload: CalculatorSavePayload,
  accountType: AccountCreatePayload['accountType']
): number | null {
  const balance = firstInputNumber(payload, ['principal', 'balance', 'corpus', 'homePrice', 'assets']);
  const amount = balance !== null && balance > 0 ? balance : firstCurrencyMetricValue(payload);

  if (amount === null) {
    return null;
  }

  if (payload.calculatorSlug === 'net-worth' && accountType === 'other_asset') {
    return Math.max(0, toCents(firstCurrencyMetricValue(payload) ?? 0));
  }

  return Math.max(0, toCents(amount));
}

function goalTypeForCalculator(slug: string): GoalCreatePayload['goalType'] {
  if (/retirement|401k|ira|nps|epf|ppf|swp|rmd|social-security/.test(slug)) return 'retirement';
  if (/emergency/.test(slug)) return 'emergency_fund';
  if (/debt|payoff|credit/.test(slug)) return 'debt_payoff';
  if (/home|mortgage|down-payment|rent-vs-buy/.test(slug)) return 'home';
  if (/education|student/.test(slug)) return 'education';
  if (/travel/.test(slug)) return 'travel';
  return 'custom';
}

function accountTypeForCalculator(slug: string, title: string): AccountCreatePayload['accountType'] {
  const text = `${slug} ${title}`.toLowerCase();

  if (/mortgage|home-loan/.test(text)) return 'mortgage';
  if (/credit-card|balance-transfer/.test(text)) return 'credit';
  if (/loan|emi|heloc|student/.test(text)) return 'loan';
  if (/401|ira|retirement|nps|epf|ppf/.test(text)) return 'retirement';
  if (/sip|mutual|investment|lumpsum/.test(text)) return 'investment';
  if (/real estate|home price|net worth/.test(text)) return 'other_asset';
  if (/fd|rd|cd|hysa|savings/.test(text)) return 'savings';
  return 'other_asset';
}

function planTypeForCalculator(
  slug: string,
  title: string
): SavedCalculatorPlanDraft['planType'] {
  const text = `${slug} ${title}`.toLowerCase();

  if (/debt|payoff|loan|credit|mortgage|refinance|balance-transfer/.test(text)) return 'debt_payoff';
  if (/retirement|fire|swp|social-security|rmd|nps|401|ira/.test(text)) return 'retirement_income';
  if (/savings|goal|sip|compound|emergency|down-payment/.test(text)) return 'savings_goal';
  return 'custom';
}

function inputNumber(payload: CalculatorSavePayload, key: string): number | null {
  const value = payload.inputValues[key];
  return Number.isFinite(value) ? value : null;
}

function firstInputNumber(payload: CalculatorSavePayload, keys: string[]): number | null {
  for (const key of keys) {
    const value = inputNumber(payload, key);

    if (value !== null) {
      return value;
    }
  }

  return null;
}

function firstCurrencyMetricValue(payload: CalculatorSavePayload): number | null {
  const metric = payload.result.metrics.find((item) => item.valueType === 'currency' && Number.isFinite(item.value));
  return metric?.value ?? null;
}

function firstCurrencyMetricCents(payload: CalculatorSavePayload): number | null {
  const value = firstCurrencyMetricValue(payload);
  return value === null ? null : Math.max(0, toCents(value));
}

export function targetDateForYears(years: number | null, start = new Date()): string | null {
  if (years === null || years <= 0) {
    return null;
  }

  const date = new Date(start);
  const totalMonths = years * 12;
  const wholeMonths = Math.floor(totalMonths);
  const fractionalMonthDays = Math.round((totalMonths - wholeMonths) * (365.2425 / 12));
  const startDay = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + wholeMonths);
  const daysInTargetMonth = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(startDay, daysInTargetMonth));
  date.setUTCDate(date.getUTCDate() + fractionalMonthDays);
  return date.toISOString().slice(0, 10);
}

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function toCents(value: number): number {
  return Math.max(0, Math.min(maxMoneyCents, Math.round(value * 100)));
}

function parseRequiredSlug(value: unknown, fieldName: string):
  | { ok: true; value: string }
  | { error: string; ok: false } {
  if (typeof value !== 'string' || !/^[a-z0-9-]{2,80}$/.test(value.trim())) {
    return { error: `${fieldName} must be a stable calculator slug.`, ok: false };
  }

  return { ok: true, value: value.trim() };
}

function parseRequiredText(value: unknown, fieldName: string, maxLength: number):
  | { ok: true; value: string }
  | { error: string; ok: false } {
  if (typeof value !== 'string') {
    return { error: `${fieldName} must be a string.`, ok: false };
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return { error: `${fieldName} is required.`, ok: false };
  }

  if (trimmed.length > maxLength) {
    return { error: `${fieldName} must be ${maxLength} characters or fewer.`, ok: false };
  }

  return { ok: true, value: trimmed };
}

function parseConversionRoute(value: unknown):
  | { ok: true; value: CalculatorSavePayload['conversionRoute'] }
  | { error: string; ok: false } {
  if (value === '/accounts' || value === '/goals' || value === '/plans' || value === '/transactions') {
    return { ok: true, value };
  }

  return { error: 'conversionRoute is not supported.', ok: false };
}

function parseCurrency(value: unknown):
  | { ok: true; value: string }
  | { error: string; ok: false } {
  if (typeof value !== 'string' || !/^[A-Z]{3}$/.test(value.trim().toUpperCase())) {
    return { error: 'currency must be a three-letter code.', ok: false };
  }

  return { ok: true, value: value.trim().toUpperCase() };
}

function parseInputValues(value: unknown):
  | { ok: true; value: Record<string, number> }
  | { error: string; ok: false } {
  if (!isRecord(value)) {
    return { error: 'inputValues must be a JSON object.', ok: false };
  }

  const entries = Object.entries(value);

  if (entries.length === 0 || entries.length > 40) {
    return { error: 'inputValues must include 1 to 40 numeric fields.', ok: false };
  }

  const normalized: Record<string, number> = {};

  for (const [key, fieldValue] of entries) {
    if (!/^[a-zA-Z][a-zA-Z0-9_]{0,60}$/.test(key)) {
      return { error: 'inputValues contains an unsupported field name.', ok: false };
    }

    if (typeof fieldValue !== 'number' || !Number.isFinite(fieldValue)) {
      return { error: `${key} must be a finite number.`, ok: false };
    }

    normalized[key] = fieldValue;
  }

  return { ok: true, value: normalized };
}

function parseCalculatorResult(value: unknown):
  | { ok: true; value: CalculatorResultSnapshot }
  | { error: string; ok: false } {
  if (!isRecord(value)) {
    return { error: 'result must be a JSON object.', ok: false };
  }

  const narrative = parseRequiredText(value.narrative, 'result.narrative', 600);
  if (!narrative.ok) return narrative;

  if (!Array.isArray(value.metrics) || value.metrics.length === 0 || value.metrics.length > 12) {
    return { error: 'result.metrics must include 1 to 12 metrics.', ok: false };
  }

  const metrics: CalculatorMetricSnapshot[] = [];

  for (const metric of value.metrics) {
    const parsed = parseMetric(metric);
    if (!parsed.ok) return parsed;
    metrics.push(parsed.value);
  }

  const assumptions = Array.isArray(value.assumptions)
    ? value.assumptions.map((assumption) => typeof assumption === 'string' ? truncateText(assumption.trim(), 240) : '').filter(Boolean).slice(0, 12)
    : [];

  return {
    ok: true,
    value: {
      assumptions,
      metrics,
      narrative: narrative.value
    }
  };
}

function parseMetric(value: unknown):
  | { ok: true; value: CalculatorMetricSnapshot }
  | { error: string; ok: false } {
  if (!isRecord(value)) {
    return { error: 'Each metric must be a JSON object.', ok: false };
  }

  const label = parseRequiredText(value.label, 'metric.label', 120);
  if (!label.ok) return label;

  if (typeof value.value !== 'number' || !Number.isFinite(value.value)) {
    return { error: 'metric.value must be a finite number.', ok: false };
  }

  if (value.valueType !== 'currency' && value.valueType !== 'number' && value.valueType !== 'percent' && value.valueType !== 'years') {
    return { error: 'metric.valueType is not supported.', ok: false };
  }

  const metric: CalculatorMetricSnapshot = {
    label: label.value,
    value: value.value,
    valueType: value.valueType
  };

  if (typeof value.description === 'string' && value.description.trim()) {
    metric.description = truncateText(value.description.trim(), 300);
  }

  if (typeof value.tone === 'string' && value.tone.trim()) {
    metric.tone = truncateText(value.tone.trim(), 40);
  }

  return { ok: true, value: metric };
}

function toSavedCalculatorResult(row: SavedCalculatorResultRow): SavedCalculatorResult {
  return {
    calculatorCategory: row.calculator_category,
    calculatorRegion: row.calculator_region,
    calculatorSlug: row.calculator_slug,
    calculatorTitle: row.calculator_title,
    conversionLabel: row.conversion_label,
    conversionRoute: row.conversion_route,
    createdAt: row.created_at,
    createdEntityId: row.created_entity_id,
    createdEntityType: row.created_entity_type,
    currency: row.currency,
    destinationType: row.destination_type,
    id: row.id,
    idempotencyKey: row.idempotency_key ?? null,
    inputValues: parseNumberRecord(row.input_json),
    payloadHash: row.payload_hash ?? null,
    result: parseResultSnapshot(row.result_json),
    updatedAt: row.updated_at
  };
}

function parseNumberRecord(value: string): Record<string, number> {
  try {
    const parsed: unknown = JSON.parse(value);

    if (!isRecord(parsed)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, number] => typeof entry[1] === 'number')
    );
  } catch {
    return {};
  }
}

function parseResultSnapshot(value: string): CalculatorResultSnapshot {
  try {
    const parsed = parseCalculatorResult(JSON.parse(value));
    return parsed.ok ? parsed.value : { assumptions: [], metrics: [], narrative: '' };
  } catch {
    return { assumptions: [], metrics: [], narrative: '' };
  }
}

function truncateText(value: string, maxLength: number): string {
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function resolveIdempotencyKey(
  bodyKey: unknown,
  headerKey?: string | null
): { ok: true; value: string | null | undefined } | { code?: string; error: string; ok: false } {
  let normalizedBodyKey: string | null | undefined = undefined;
  if (bodyKey !== undefined) {
    if (bodyKey === null || bodyKey === '') {
      normalizedBodyKey = null;
    } else if (typeof bodyKey !== 'string') {
      return { error: 'idempotencyKey must be a string.', ok: false };
    } else {
      const trimmed = bodyKey.trim();
      if (!trimmed) {
        normalizedBodyKey = null;
      } else if (trimmed.length > 120) {
        return { error: 'idempotencyKey must be 120 characters or fewer.', ok: false };
      } else {
        normalizedBodyKey = trimmed;
      }
    }
  }

  let normalizedHeaderKey: string | null | undefined = undefined;
  if (headerKey !== undefined && headerKey !== null) {
    if (typeof headerKey !== 'string') {
      return { error: 'Idempotency-Key header must be a string.', ok: false };
    }
    const trimmed = headerKey.trim();
    if (!trimmed) {
      normalizedHeaderKey = null;
    } else if (trimmed.length > 120) {
      return { error: 'Idempotency-Key header must be 120 characters or fewer.', ok: false };
    } else {
      normalizedHeaderKey = trimmed;
    }
  }

  const hasBody = normalizedBodyKey !== undefined && normalizedBodyKey !== null;
  const hasHeader = normalizedHeaderKey !== undefined && normalizedHeaderKey !== null;

  if (hasBody && hasHeader) {
    if (normalizedBodyKey !== normalizedHeaderKey) {
      return {
        code: IDEMPOTENCY_KEY_MISMATCH_CODE,
        error: IDEMPOTENCY_KEY_MISMATCH_MESSAGE,
        ok: false
      };
    }
    return { ok: true, value: normalizedBodyKey };
  }

  if (hasBody) {
    return { ok: true, value: normalizedBodyKey };
  }

  if (hasHeader) {
    return { ok: true, value: normalizedHeaderKey };
  }

  if (normalizedBodyKey === null || normalizedHeaderKey === null) {
    return { ok: true, value: null };
  }

  return { ok: true, value: undefined };
}

export async function hashCalculatorPayload(payload: CalculatorSavePayload): Promise<string> {
  const canonical = {
    calculatorCategory: payload.calculatorCategory,
    calculatorRegion: payload.calculatorRegion,
    calculatorSlug: payload.calculatorSlug,
    calculatorTitle: payload.calculatorTitle,
    conversionLabel: payload.conversionLabel,
    conversionRoute: payload.conversionRoute,
    currency: payload.currency,
    inputValues: Object.keys(payload.inputValues)
      .sort()
      .reduce<Record<string, number>>((acc, key) => {
        acc[key] = payload.inputValues[key];
        return acc;
      }, {}),
    result: {
      assumptions: [...payload.result.assumptions],
      metrics: payload.result.metrics.map((metric) => ({
        description: metric.description ?? '',
        label: metric.label,
        tone: metric.tone ?? '',
        value: metric.value,
        valueType: metric.valueType
      })),
      narrative: payload.result.narrative
    }
  };

  const jsonString = JSON.stringify(canonical);
  const data = new TextEncoder().encode(jsonString);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function isUniqueConstraintError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('unique constraint') ||
      message.includes('sqlite_constraint') ||
      message.includes('d1_error: unique')
    );
  }
  return false;
}
