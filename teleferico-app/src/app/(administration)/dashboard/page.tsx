import LogoutButton from "./_components/LogoutButton";
import { auth } from "@/auth";

export default async function DashboardPage() {
  const session = await auth();
  console.log("dashboard session", session);

  return (
    <div>
      <h1 className="font-bold">Dashboard page</h1>
      <LogoutButton />
    </div>
  );
}
