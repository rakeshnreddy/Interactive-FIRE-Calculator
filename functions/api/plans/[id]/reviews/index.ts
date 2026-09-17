/// <reference types="@cloudflare/workers-types" />

import {
  createPlanReview,
  listPlanReviews,
  parsePlanReviewPayload,
  ReviewTooEarlyError
} from '../../../../_lib/planReviews';
import { readJsonBody } from '../../../../_lib/firePlans';
import { json } from '../../../../_lib/http';
import { handleApiError, requireDatabase } from '../../../../_lib/persistence';
import { requireClerkAuth } from '../../../../_lib/session';
import type { DatabaseEnv } from '../../../../_lib/persistence';
import type { ClerkEnv } from '../../../../_lib/session';

type ReviewsEnv = ClerkEnv & DatabaseEnv;
type PlanReviewsParams = 'id';

export const onRequestGet: PagesFunction<ReviewsEnv, PlanReviewsParams> = async ({ request, env, params }) => {
  const context = await requirePlanContext(request, env, params);

  if (!context.ok) {
    return context.response;
  }

  try {
    const result = await listPlanReviews(context.database, context.userId, context.planId);

    if (!result) {
      return json({ error: 'Plan not found.' }, 404);
    }

    return json(result);
  } catch (error) {
    return handleApiError(error, 'Unable to load plan reviews.');
  }
};

export const onRequestPost: PagesFunction<ReviewsEnv, PlanReviewsParams> = async ({ request, env, params }) => {
  const context = await requirePlanContext(request, env, params);

  if (!context.ok) {
    return context.response;
  }

  const body = await readJsonBody(request);
  const parsed = parsePlanReviewPayload(body);

  if (!parsed.ok) {
    return json({ error: parsed.error }, 400);
  }

  try {
    const result = await createPlanReview(context.database, context.userId, context.planId, parsed.value);

    if (!result) {
      return json({ error: 'Plan or version not found.' }, 404);
    }

    return json({ dueStatus: result.dueStatus, review: result.review }, result.isDuplicate ? 200 : 201);
  } catch (error) {
    if (error instanceof ReviewTooEarlyError) {
      return json({ error: error.message }, 400);
    }

    return handleApiError(error, 'Unable to save plan review.');
  }
};

async function requirePlanContext(
  request: Request,
  env: ReviewsEnv,
  params: EventContext<ReviewsEnv, PlanReviewsParams, Record<string, unknown>>['params']
): Promise<
  | {
      database: D1Database;
      ok: true;
      planId: string;
      userId: string;
    }
  | {
      ok: false;
      response: Response;
    }
> {
  const planId = readPlanId(params);

  if (!planId) {
    return { ok: false, response: json({ error: 'Plan id is required.' }, 400) };
  }

  const session = await requireClerkAuth(request, env);

  if (!session.ok) {
    return session;
  }

  const db = requireDatabase(env);

  if (!db.ok) {
    return db;
  }

  return {
    database: db.database,
    ok: true,
    planId,
    userId: session.auth.userId
  };
}

function readPlanId(params: EventContext<ReviewsEnv, PlanReviewsParams, Record<string, unknown>>['params']): string | null {
  const id = params.id;
  const planId = Array.isArray(id) ? id[0] : id;
  const trimmed = planId?.trim();

  return trimmed && trimmed.length > 0 ? trimmed : null;
}
