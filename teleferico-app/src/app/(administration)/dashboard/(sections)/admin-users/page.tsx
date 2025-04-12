import { getUsers } from "@/lib/services";
import { getSession } from "@/utils/auth";
import Table from "./_components/Table";

export default async function AdminUsersPage() {
  const session = await getSession();
  const res = await getUsers(session.jwt);

  if (res.ok) {
    return <Table users={res.data} />;
  }
  return <Table users={[]} />;
}
