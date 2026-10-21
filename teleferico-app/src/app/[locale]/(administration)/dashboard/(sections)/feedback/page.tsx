import { auth } from "@/auth";
import FeedbackDashboard from "@/components/administration/feedback/FeedbackDashboard";
import { isFeedbackCapabilityEnabled } from "@/lib/feedback/capability-gate";
import { notFound } from "next/navigation";

export default async function FeedbackPage() {
  if (!isFeedbackCapabilityEnabled()) notFound();
  const session = await auth();
  if (session?.user.role?.name !== "Digital Experience Operator" ||
      !session.user.capabilities?.includes("feedback.read")) notFound();
  return <FeedbackDashboard />;
}
