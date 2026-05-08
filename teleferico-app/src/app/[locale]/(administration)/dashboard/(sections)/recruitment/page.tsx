import { getSectors } from "@/lib/services";
import { NoReachError } from "./_components/Errors";
import Tabs from "./_components/Tabs";
import { getSession } from "@/lib/auth/get-session";

export default async function RecruitmentPage() {
  const { ok, data } = await getSectors("es-AR", { activeOnly: false });
  const { user } = await getSession();

  if (!ok) return <NoReachError />;

  const sectors = data?.data ?? [];

  return <Tabs sectors={sectors} userId={user.id} />;
}
