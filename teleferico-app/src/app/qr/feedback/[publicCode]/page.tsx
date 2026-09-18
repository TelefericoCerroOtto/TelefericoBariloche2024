import type { Metadata } from "next";
import FeedbackForm from "./FeedbackForm";

type Params = { params: Promise<{ publicCode: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { publicCode } = await params;
  return {
    title: "Visitor feedback",
    description: `Visitor feedback form for ${publicCode}`,
    robots: { index: false, follow: false },
  };
}

export default async function FeedbackPage({ params }: Params) {
  const { publicCode } = await params;
  return <FeedbackForm publicCode={publicCode} />;
}
