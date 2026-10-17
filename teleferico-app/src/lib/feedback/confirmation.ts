import type { FeedbackLocale } from "@/types/api/feedback";
import { isAuthoritativeReceipt } from "./ui-contract";

export const FEEDBACK_CONFIRMATION_KEY = "tb113-feedback-confirmation";

type Receipt = {
  readonly submissionReceipt: string;
  readonly acceptedAt: string;
  readonly guardUntil: string;
};

export type FeedbackConfirmation = Receipt & {
  readonly locale: FeedbackLocale;
};

type ConfirmationStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function readFeedbackConfirmation(
  storage: ConfirmationStorage,
  now: () => number = Date.now,
): FeedbackConfirmation | null {
  try {
    const raw = storage.getItem(FEEDBACK_CONFIRMATION_KEY);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (
      !isAuthoritativeReceipt(value) ||
      !value ||
      typeof value !== "object" ||
      !["es", "en", "pt"].includes(
        String((value as { locale?: unknown }).locale),
      ) ||
      Date.parse(value.guardUntil) <= now()
    ) {
      storage.removeItem(FEEDBACK_CONFIRMATION_KEY);
      return null;
    }
    return value as FeedbackConfirmation;
  } catch {
    try {
      storage.removeItem(FEEDBACK_CONFIRMATION_KEY);
    } catch {
      /* Storage may be unavailable. */
    }
    return null;
  }
}

export function saveFeedbackConfirmation(
  storage: ConfirmationStorage,
  receipt: Receipt,
  locale: FeedbackLocale,
): void {
  try {
    storage.setItem(
      FEEDBACK_CONFIRMATION_KEY,
      JSON.stringify({ ...receipt, locale }),
    );
  } catch {
    // An accepted response remains successful even if browser storage is unavailable.
  }
}
