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
  ): Promise<Pick<StoredSubmission, "receipt" | "acceptedAt" | "payloadDigest"> | null>;
  insert(_submission: StoredSubmission): Promise<void>;
};

export type AcceptanceStore = {
  withTransaction<T>(
    _operation: (_transaction: SubmissionTransaction) => Promise<T>,
  ): Promise<T>;
};

export class IdempotencyReplayError extends Error {
  readonly code = "IDEMPOTENCY_REPLAY";
  readonly receipt: string;
  readonly acceptedAt: string;

  constructor(receipt: string, acceptedAt: string) {
    super("The submission was already accepted");
    this.name = "IdempotencyReplayError";
    this.receipt = receipt;
    this.acceptedAt = acceptedAt;
  }
}

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
        readonly status: 409 | 410 | 503;
        readonly code:
          | "IDEMPOTENCY_CONFLICT"
          | "GUARD_ACTIVE"
          | "SURVEY_UNAVAILABLE"
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

function acceptedValue(submission: Pick<StoredSubmission, "receipt" | "acceptedAt">): AcceptedValue | null {
  const acceptedAt = new Date(submission.acceptedAt);
  if (Number.isNaN(acceptedAt.getTime()) || acceptedAt.toISOString() !== submission.acceptedAt) {
    return null;
  }
  return {
    submissionReceipt: submission.receipt,
    acceptedAt: submission.acceptedAt,
    guardUntil: new Date(acceptedAt.getTime() + GUARD_DURATION_MILLISECONDS).toISOString(),
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
        if (existing.payloadDigest !== digest) {
          return { ok: false, error: { status: 409, code: "IDEMPOTENCY_CONFLICT" } };
        }
        const replay = acceptedValue(existing);
        if (!replay) throw new Error("Invalid authoritative replay");
        return { ok: true, status: 200, value: replay };
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
      const accepted = acceptedValue(submission);
      if (!accepted) throw new Error("Invalid acceptance timestamp");
      return { ok: true, status: 201, value: accepted };
    });
  } catch (error) {
    if (error instanceof IdempotencyReplayError) {
      const replay = acceptedValue(error);
      return replay
        ? { ok: true, status: 200, value: replay }
        : { ok: false, error: { status: 503, code: "UPSTREAM_UNAVAILABLE" } };
    }
    if (typeof error === "object" && error !== null && "code" in error) {
      if (error.code === "IDEMPOTENCY_CONFLICT") {
        return { ok: false, error: { status: 409, code: "IDEMPOTENCY_CONFLICT" } };
      }
      if (error.code === "SURVEY_UNAVAILABLE") {
        return { ok: false, error: { status: 410, code: "SURVEY_UNAVAILABLE" } };
      }
    }
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
