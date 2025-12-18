import { getSectors } from "@/lib/services";
import { NoContentError, NoReachError } from "./_components/Errors";
import Tabs from "./_components/Tabs";
import { getSession } from "@/utils";

export default async function RecruitmentPage() {
  const { ok, data } = await getSectors("es-AR");
  const { user } = await getSession();

  if (!ok) return <NoReachError />;

  const sectors = data?.data ?? [];

  if (sectors.length === 0) return <NoContentError />;

  return <Tabs sectors={sectors} userId={user.id} />;
}
