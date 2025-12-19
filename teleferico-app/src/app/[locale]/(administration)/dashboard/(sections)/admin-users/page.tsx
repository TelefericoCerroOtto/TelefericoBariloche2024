import { getUsers } from "@/lib/services";
import UsersAdminTable from "./_components/UsersAdminTable";
import { getSession } from "@/lib/auth/get-session";

export default async function AdminUsersPage() {
  const session = await getSession();
  const res = await getUsers(session.jwt);

  if (res.ok) {
    return <UsersAdminTable users={res.data} />;
  }
  return <UsersAdminTable users={[]} />;
}
