import type { Locales, Schedules } from "@/types";
import { Suspense } from "react";
import SchedulesServer from "./SchedulesServer";
import Loading from "./Loading";

interface Props {
  locale: Locales;
  block: Schedules;
}

export default function Schedules(props: Props) {
  const { locale, block } = props;

  const zonesId = block.zones?.map((z) => z.documentId) ?? [];

  return (
    <div className="my-14">
      <Suspense fallback={<Loading />}>
        <SchedulesServer locale={locale} zonesId={zonesId} />
      </Suspense>
    </div>
  );
}
