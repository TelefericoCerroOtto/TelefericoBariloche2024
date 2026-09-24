import FeedbackDashboard from "@/components/administration/feedback/FeedbackDashboard";
import { isFeedbackCapabilityEnabled } from "@/lib/feedback/capability-gate";
import { notFound } from "next/navigation";

export default function FeedbackPage() {
  if (!isFeedbackCapabilityEnabled()) notFound();
  return <FeedbackDashboard />;
}
