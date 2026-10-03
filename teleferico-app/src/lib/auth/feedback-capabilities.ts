import type { FeedbackAdminCapability } from "@/types/api/admin/feedback";

export type VerifiedFeedbackUser = {
  readonly blocked: boolean;
  readonly role?: { readonly name?: string } | null;
};

export const FEEDBACK_ADMIN_CAPABILITIES = [
  "feedback.read",
  "feedback.comments.read",
  "feedback.reports.read",
  "feedback.reports.generate",
] as const satisfies readonly FeedbackAdminCapability[];

const FEEDBACK_ADMIN_ROLES = new Set([
  "Administrator",
  "Digital Experience Operator",
]);

export function feedbackCapabilitiesForUser(
  user: VerifiedFeedbackUser | null | undefined,
): readonly FeedbackAdminCapability[] {
  if (
    !user ||
    user.blocked !== false ||
    !user.role?.name ||
    !FEEDBACK_ADMIN_ROLES.has(user.role.name)
  )
    return [];

  return FEEDBACK_ADMIN_CAPABILITIES;
}
