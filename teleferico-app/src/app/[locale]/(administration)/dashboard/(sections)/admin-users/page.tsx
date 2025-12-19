import { getUsers } from "@/lib/services";
import { getSession } from "@/utils";
import UsersAdminTable from "./_components/UsersAdminTable";

export default async function AdminUsersPage() {
  const session = await getSession();
  const res = await getUsers(session.jwt);

  if (res.ok) {
    return <UsersAdminTable users={res.data} />;
  }
  return <UsersAdminTable users={[]} />;
}
