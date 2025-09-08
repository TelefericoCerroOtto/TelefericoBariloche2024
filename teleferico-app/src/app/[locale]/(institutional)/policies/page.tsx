import { BlocksRenderer, NoContent } from "@/components";
import { getPageContent } from "@/lib/services";
import type { Locales } from "@/types";
import { ROUTES } from "@/utils";
import { Spacer } from "@heroui/react";
import { Suspense } from "react";
import Loader from "./_components/Loader";
import Rules from "./_components/Rules";

export default async function PoliciesPage({
  params,
}: Readonly<{
  params: Promise<{ locale: Locales }>;
}>) {
  const { locale } = await params;

  const { ok, data } = await getPageContent(locale, ROUTES.POLICIES);

  if (!ok)
    throw new Error(
      "Ocurrio un error y no se pudo recuperar la informacion sobre el relgamento",
    );

  if (data.data.length === 0) return <NoContent locale={locale} />;

  const { blocks } = data.data[0];

  return (
    <>
      <Spacer y={28} />
      <div className="flex w-full flex-col gap-14 px-10 lg:px-28">
        <BlocksRenderer locale={locale} blocks={blocks} />
        <Suspense fallback={<Loader />}>
          <Rules locale={locale} />
        </Suspense>
      </div>
    </>
  );
}
