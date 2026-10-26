import "server-only";

import { validateTrustedCmsOrigin } from "@teleferico/tb113-runtime-contracts";
import { FeedbackAdminCommandError } from "./admin-command";
import { readTb113AppTokens, readTb113CmsOrigin } from "./tb113-runtime-config";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const UNSAFE_TEXT = /[\p{Cc}\p{Cf}]/u;
const VISUAL_FILLERS = /[\u115f\u1160\u2800\u3164\uffa0]/u;
const VISIBLE_TEXT = /[\p{L}\p{N}\p{P}\p{S}]/u;

type PresentationCommand =
  | { readonly action: "rename"; readonly displayName: string }
  | { readonly action: "hide" };

export function parsePresentationCommand(reportRunId: string, value: unknown): PresentationCommand | null {
  if (!UUID.test(reportRunId) || !value || typeof value !== "object" || Array.isArray(value)) return null;
  const command = value as Record<string, unknown>;
  if (command.contractVersion !== "feedback-admin.v1") return null;
  if (command.action === "hide" && Object.keys(command).length === 2) return { action: "hide" };
  if (command.action !== "rename" || Object.keys(command).length !== 3 || typeof command.displayName !== "string") return null;
  const displayName = command.displayName.trim().normalize("NFC");
  return displayName.length >= 1 && displayName.length <= 80 && !UNSAFE_TEXT.test(displayName) &&
    !VISUAL_FILLERS.test(displayName) && VISIBLE_TEXT.test(displayName)
    ? { action: "rename", displayName }
    : null;
}

export function createFeedbackAdminPresentationTransport(options: {
  readonly baseUrl: string;
  readonly allowedOrigins: readonly string[];
  readonly token: string;
  readonly fetchImplementation?: typeof fetch;
}) {
  let origin: URL;
  try {
    origin = validateTrustedCmsOrigin(
      options.baseUrl,
      options.allowedOrigins,
      process.env.NODE_ENV === "development" ? "development" : "production",
    );
    if (!options.token || /[\u0000-\u0020\u007f]/.test(options.token)) throw new TypeError();
  } catch {
    throw new FeedbackAdminCommandError("UPSTREAM_UNAVAILABLE", 503);
  }
  const fetchImplementation = options.fetchImplementation ?? fetch;
  return Object.freeze({
    async update(reportRunId: string, command: PresentationCommand) {
      if (!UUID.test(reportRunId) || !parsePresentationCommand(reportRunId, { contractVersion: "feedback-admin.v1", ...command }))
        throw new FeedbackAdminCommandError("VALIDATION_FAILED", 400);
      let response: Response;
      try {
        response = await fetchImplementation(
          `${origin.origin}/api/tb113/admin/generations/${reportRunId}/presentation`,
          {
            method: "POST",
            headers: { authorization: `Bearer ${options.token}`, "content-type": "application/json", accept: "application/json" },
            body: JSON.stringify({ contractVersion: "feedback-admin.v1", ...command }),
            cache: "no-store",
            redirect: "error",
            signal: AbortSignal.timeout(10_000),
          },
        );
      } catch {
        throw new FeedbackAdminCommandError("UPSTREAM_UNAVAILABLE", 503);
      }
      if (response.redirected || (response.url && new URL(response.url).origin !== origin.origin))
        throw new FeedbackAdminCommandError("UPSTREAM_UNAVAILABLE", 503);
      if (!response.ok) {
        if (response.status === 409) throw new FeedbackAdminCommandError("INVALID_STATE", 409);
        throw new FeedbackAdminCommandError("UPSTREAM_UNAVAILABLE", 503);
      }
      let result: unknown;
      try { result = await response.json(); } catch {
        throw new FeedbackAdminCommandError("UPSTREAM_UNAVAILABLE", 503);
      }
      if (!result || typeof result !== "object" || Array.isArray(result))
        throw new FeedbackAdminCommandError("UPSTREAM_UNAVAILABLE", 503);
      const value = result as Record<string, unknown>;
      if (Object.keys(value).length !== 4 || value.contractVersion !== "feedback-admin.v1" ||
          value.reportRunId !== reportRunId || typeof value.historyHidden !== "boolean" ||
          (value.displayName !== null && (typeof value.displayName !== "string" || value.displayName.length < 1 || value.displayName.length > 80)) ||
          (command.action === "hide" && value.historyHidden !== true))
        throw new FeedbackAdminCommandError("UPSTREAM_UNAVAILABLE", 503);
      return { reportRunId, displayName: value.displayName as string | null, historyHidden: value.historyHidden };
    },
  });
}

export function getFeedbackAdminPresentationTransport(token: string) {
  try {
    const origin = readTb113CmsOrigin();
    if (Object.values(readTb113AppTokens()).includes(token)) throw new TypeError();
    return createFeedbackAdminPresentationTransport({ ...origin, token });
  } catch {
    throw new FeedbackAdminCommandError("UPSTREAM_UNAVAILABLE", 503);
  }
}
