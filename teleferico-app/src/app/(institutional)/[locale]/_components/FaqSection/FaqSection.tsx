import { Suspense } from "react";
import Content from "./Content";
import Loader from "./Loader";
import { Locales } from "@/types";

interface Props {
  locale: Locales;
}

export default function FaqSection(props: Props) {
  const { locale } = props;
  console.log("FaqSection locale", locale);
  return (
    <Suspense fallback={<Loader />}>
      <Content locale={locale} />
    </Suspense>
  );
}
