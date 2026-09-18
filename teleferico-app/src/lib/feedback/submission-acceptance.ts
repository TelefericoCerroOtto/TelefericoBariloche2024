import { createHash } from "node:crypto";
import type { ValidatedFeedbackAnswers } from "@/types/api/feedback";
import type { FeedbackBrowserGuard } from "./browser-guard";
import type { QrSessionClaims } from "./qr-session";

const GUARD_DURATION_MILLISECONDS = 24 * 60 * 60 * 1_000;

export type SubmissionAcceptanceInput = {
  readonly contractVersion: "feedback-public.v1";
  readonly sessionToken: string;
  readonly session: QrSessionClaims;
  readonly idempotencyKey: string;
  readonly browserTokenHash: string;
  readonly pointDocumentId: string;
  readonly versionDocumentId: string;
  readonly answers: ValidatedFeedbackAnswers;
};

export type StoredSubmission = {
  readonly receipt: string;
  readonly acceptedAt: string;
  readonly source: "valid_qr";
  readonly locale: ValidatedFeedbackAnswers["locale"];
  readonly overallRating: ValidatedFeedbackAnswers["overallRating"];
  readonly ratings: ValidatedFeedbackAnswers["ratings"];
  readonly comment?: string;
  readonly sessionNonceHash: string;
  readonly payloadDigest: string;
  readonly browserTokenHash: string;
  readonly idempotencyKey: string;
  readonly pointDocumentId: string;
  readonly versionDocumentId: string;
};

export type SubmissionTransaction = {
  // The adapter must lock this pair whether or not a row already exists.
  lockAndFindByIdempotency(
    _sessionNonceHash: string,
    _idempotencyKey: string,
  ): Promise<StoredSubmission | null>;
  insert(_submission: StoredSubmission): Promise<void>;
};

export type AcceptanceStore = {
  withTransaction<T>(
    _operation: (_transaction: SubmissionTransaction) => Promise<T>,
  ): Promise<T>;
};

type AcceptanceDependencies = {
  readonly store: AcceptanceStore;
  readonly browserGuard: FeedbackBrowserGuard;
  readonly now: () => Date;
  readonly createReceipt: () => string;
};

type AcceptedValue = {
  readonly submissionReceipt: string;
  readonly acceptedAt: string;
  readonly guardUntil: string;
};

type AcceptanceResult =
  | {
      readonly ok: true;
      readonly status: 200 | 201;
      readonly value: AcceptedValue;
    }
  | {
      readonly ok: false;
      readonly error: {
        readonly status: 409 | 503;
        readonly code:
          | "IDEMPOTENCY_CONFLICT"
          | "GUARD_ACTIVE"
          | "UPSTREAM_UNAVAILABLE";
      };
    };

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function payloadDigest(input: SubmissionAcceptanceInput): string {
  const standardRatings = input.answers.ratings
    .filter((rating) => rating.aspectKey !== "other")
    .map(({ aspectKey, rating }) => ({ aspectKey, rating }));
  const other = input.answers.ratings.find(
    (rating) => rating.aspectKey === "other",
  );
  const session = {
    v: input.session.v,
    pointKey: input.session.pointKey,
    publicCodeHash: input.session.publicCodeHash,
    versionKey: input.session.versionKey,
    versionRevision: input.session.versionRevision,
    capability: input.session.capability,
    nonce: input.session.nonce,
    iat: input.session.iat,
    exp: input.session.exp,
  };
  return sha256(
    JSON.stringify({
      contractVersion: input.contractVersion,
      session,
      browserTokenHash: input.browserTokenHash,
      locale: input.answers.locale,
      overallRating: input.answers.overallRating,
      aspects: standardRatings,
      otherAspect: other
        ? { customText: other.customText, rating: other.rating }
        : null,
      comment: input.answers.comment ?? null,
    }),
  );
}

function acceptedValue(submission: StoredSubmission): AcceptedValue {
  return {
    submissionReceipt: submission.receipt,
    acceptedAt: submission.acceptedAt,
    guardUntil: new Date(
      new Date(submission.acceptedAt).getTime() + GUARD_DURATION_MILLISECONDS,
    ).toISOString(),
  };
}

export async function acceptSubmission(
  input: SubmissionAcceptanceInput,
  dependencies: AcceptanceDependencies,
): Promise<AcceptanceResult> {
  const sessionNonceHash = sha256(input.session.nonce);
  const digest = payloadDigest(input);

  let result: AcceptanceResult;
  try {
    result = await dependencies.store.withTransaction(async (transaction) => {
      const existing = await transaction.lockAndFindByIdempotency(
        sessionNonceHash,
        input.idempotencyKey,
      );
      if (existing) {
        return existing.payloadDigest === digest
          ? { ok: true, status: 200, value: acceptedValue(existing) }
          : { ok: false, error: { status: 409, code: "IDEMPOTENCY_CONFLICT" } };
      }

      if (await dependencies.browserGuard.isActive(input.browserTokenHash)) {
        return { ok: false, error: { status: 409, code: "GUARD_ACTIVE" } };
      }

      const submission: StoredSubmission = {
        receipt: dependencies.createReceipt(),
        acceptedAt: dependencies.now().toISOString(),
        source: "valid_qr",
        locale: input.answers.locale,
        overallRating: input.answers.overallRating,
        ratings: input.answers.ratings,
        ...(input.answers.comment === undefined
          ? {}
          : { comment: input.answers.comment }),
        sessionNonceHash,
        payloadDigest: digest,
        browserTokenHash: input.browserTokenHash,
        idempotencyKey: input.idempotencyKey,
        pointDocumentId: input.pointDocumentId,
        versionDocumentId: input.versionDocumentId,
      };
      await transaction.insert(submission);
      return { ok: true, status: 201, value: acceptedValue(submission) };
    });
  } catch {
    return { ok: false, error: { status: 503, code: "UPSTREAM_UNAVAILABLE" } };
  }

  if (result.ok && result.status === 201) {
    await dependencies.browserGuard.persist(
      input.browserTokenHash,
      result.value.guardUntil,
    );
  }

  return result;
}
