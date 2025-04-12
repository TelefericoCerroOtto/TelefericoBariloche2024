import { Suspense } from "react";
import Content from "./Content";
import Loader from "./Loader";
import { Locales } from "@/types";

interface Props {
  locale: Locales;
  favs?: boolean;
}

export default function FaqSection(props: Props) {
  const { locale, favs = false } = props;

  return (
    <Suspense fallback={<Loader />}>
      <Content locale={locale} favs={favs} />
    </Suspense>
  );
}
