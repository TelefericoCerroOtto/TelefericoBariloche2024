import { describe, expect, it } from "vitest";
import {
  createFeedbackDraftStore,
  createFeedbackDraftKey,
  type FeedbackDraft,
} from "./draft";

const draft: FeedbackDraft = {
  locale: "en",
  stage: "sentiments",
  overallRating: 4,
  selectedAspectKeys: ["views"],
  sentiments: { views: "positive" },
  otherText: "",
  comment: "A clear view.",
  savedAt: 1_000,
  expiresAt: 7_200_000,
};

describe("QR-bound feedback drafts", () => {
  it("keys drafts by point, version, and pseudonymous browser context", () => {
    expect(createFeedbackDraftKey("visitor-v1", "summit", "browser-a")).toBe(
      "tb113-feedback-draft:visitor-v1:summit:browser-a",
    );
  });

  it("restores an unexpired draft and removes expired or malformed data", () => {
    const storage = new Map<string, string>();
    const fakeStorage = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    } satisfies Pick<Storage, "getItem" | "setItem" | "removeItem">;
    const store = createFeedbackDraftStore(fakeStorage, () => 2_000);
    const key = createFeedbackDraftKey("visitor-v1", "summit", "browser-a");

    store.save(key, draft);
    expect(store.read(key)).toEqual(draft);

    storage.set(key, JSON.stringify({ ...draft, expiresAt: 1_999 }));
    expect(store.read(key)).toBeNull();
    expect(storage.has(key)).toBe(false);

    storage.set(key, "not-json");
    expect(store.read(key)).toBeNull();
    expect(storage.has(key)).toBe(false);
  });
});
