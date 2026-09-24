import type { Metadata } from "next";
import { isFeedbackCapabilityEnabled } from "@/lib/feedback/capability-gate";
import { notFound } from "next/navigation";
import FeedbackForm from "./FeedbackForm";

type Params = { params: Promise<{ publicCode: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  if (!isFeedbackCapabilityEnabled()) notFound();
  const { publicCode } = await params;
  return {
    title: "Visitor feedback",
    description: `Visitor feedback form for ${publicCode}`,
    robots: { index: false, follow: false },
  };
}

export default async function FeedbackPage({ params }: Params) {
  if (!isFeedbackCapabilityEnabled()) notFound();
  const { publicCode } = await params;
  return <FeedbackForm publicCode={publicCode} />;
}
