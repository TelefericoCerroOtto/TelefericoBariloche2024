import type { Locales } from "@/types";
import { Suspense } from "react";
import Loading from "./Loading";
import SchedulesServer from "./SchedulesServer";

interface Props {
  locale: Locales;
}

export default function Schedules(props: Props) {
  const { locale } = props;

  return (
    <div className="my-14">
      <Suspense fallback={<Loading />}>
        <SchedulesServer locale={locale} />
      </Suspense>
    </div>
  );
}
