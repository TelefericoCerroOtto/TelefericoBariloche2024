import type { Locales } from "@/types";
import { Spacer } from "@heroui/react";
import Rules from "./_components/Rules";

export default async function PostulationPrivacyPage({
  params,
}: Readonly<{
  params: Promise<{ locale: Locales }>;
}>) {
  const { locale } = await params;

  return (
    <div className="flex w-full flex-col gap-14 px-10 lg:px-28">
      <Spacer y={4} />
      <Rules locale={locale} />
      <Spacer y={8} />
    </div>
  );
}
