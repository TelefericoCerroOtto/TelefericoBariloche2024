import { describe, expect, it, vi } from "vitest";
import {
  FEEDBACK_CONFIRMATION_KEY,
  readFeedbackConfirmation,
  saveFeedbackConfirmation,
} from "./confirmation";

const receipt = {
  submissionReceipt: "receipt-123",
  acceptedAt: "2026-09-17T12:00:00.000Z",
  guardUntil: "2026-09-24T12:00:00.000Z",
};

describe("feedback confirmation", () => {
  it("restores an accepted receipt across QR points only until the guard ends", () => {
    const storage = new Map<string, string>();
    const browserStorage = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
    };
    saveFeedbackConfirmation(browserStorage, receipt, "en");
    expect(
      readFeedbackConfirmation(
        browserStorage,
        () => Date.parse(receipt.guardUntil) - 1,
      ),
    ).toEqual({ ...receipt, locale: "en" });
    expect(
      readFeedbackConfirmation(browserStorage, () =>
        Date.parse(receipt.guardUntil),
      ),
    ).toBeNull();
    expect(storage.has(FEEDBACK_CONFIRMATION_KEY)).toBe(false);
  });

  it("ignores malformed data and browser storage failures", () => {
    const removeItem = vi.fn();
    expect(
      readFeedbackConfirmation({
        getItem: () => '{"submissionReceipt":"fake"}',
        setItem: vi.fn(),
        removeItem,
      }),
    ).toBeNull();
    expect(removeItem).toHaveBeenCalledWith(FEEDBACK_CONFIRMATION_KEY);
    expect(() =>
      saveFeedbackConfirmation(
        {
          getItem: vi.fn(),
          setItem: () => {
            throw new Error("quota");
          },
          removeItem: vi.fn(),
        },
        receipt,
        "es",
      ),
    ).not.toThrow();
  });
});
