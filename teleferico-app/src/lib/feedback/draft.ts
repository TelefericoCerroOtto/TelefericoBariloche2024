import type {
  FeedbackLocale,
  FeedbackRating,
  FeedbackSentiment,
} from "@/types/api/feedback";
import type { FeedbackStage } from "./ui-contract";

export type FeedbackDraft = {
  readonly locale: FeedbackLocale;
  readonly stage: FeedbackStage;
  readonly overallRating: FeedbackRating | null;
  readonly selectedAspectKeys: readonly string[];
  readonly sentiments: Readonly<Record<string, FeedbackSentiment>>;
  readonly otherText: string;
  readonly comment: string;
  readonly savedAt: number;
  readonly expiresAt: number;
};

type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function createFeedbackDraftKey(
  versionKey: string,
  pointKey: string,
  browserContext: string,
): string {
  return `tb113-feedback-draft:${versionKey}:${pointKey}:${browserContext}`;
}

export function createFeedbackDraftStore(
  storage: DraftStorage,
  now: () => number = Date.now,
) {
  return {
    read(key: string): FeedbackDraft | null {
      const raw = storage.getItem(key);
      if (!raw) return null;

      try {
        const parsed: unknown = JSON.parse(raw);
        if (!isFeedbackDraft(parsed) || parsed.expiresAt <= now()) {
          storage.removeItem(key);
          return null;
        }
        return parsed;
      } catch {
        storage.removeItem(key);
        return null;
      }
    },
    save(key: string, draft: FeedbackDraft): void {
      storage.setItem(key, JSON.stringify(draft));
    },
    remove(key: string): void {
      storage.removeItem(key);
    },
  };
}

function isFeedbackDraft(value: unknown): value is FeedbackDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as Record<string, unknown>;
  const validStage = [
    "overall",
    "aspects",
    "sentiments",
    "comment",
    "verification",
    "success",
  ].includes(String(draft.stage));
  const validLocale = ["es", "en", "pt"].includes(String(draft.locale));
  const validRating =
    draft.overallRating === null ||
    [1, 2, 3, 4, 5].includes(Number(draft.overallRating));

  return (
    validStage &&
    validLocale &&
    validRating &&
    Array.isArray(draft.selectedAspectKeys) &&
    draft.selectedAspectKeys.every((key) => typeof key === "string") &&
    isSentimentRecord(draft.sentiments) &&
    typeof draft.otherText === "string" &&
    typeof draft.comment === "string" &&
    typeof draft.savedAt === "number" &&
    typeof draft.expiresAt === "number"
  );
}

function isSentimentRecord(
  value: unknown,
): value is Readonly<Record<string, FeedbackSentiment>> {
  if (!value || typeof value !== "object") return false;
  return Object.values(value as Record<string, unknown>).every((sentiment) =>
    ["negative", "neutral", "positive"].includes(String(sentiment)),
  );
}
