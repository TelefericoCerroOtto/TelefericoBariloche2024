import { Suspense } from "react";
import Content from "./Content";
import Loader from "./Loader";
import { Locales } from "@/types";

interface Props {
  locale: Locales;
  allFaqs?: boolean;
}

export default function FaqSection(props: Props) {
  const { locale, allFaqs = false } = props;

  return (
    <Suspense fallback={<Loader />}>
      <Content locale={locale} allFaqs={allFaqs} />
    </Suspense>
  );
}
