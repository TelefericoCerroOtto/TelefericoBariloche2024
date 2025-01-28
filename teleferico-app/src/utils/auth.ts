import { auth, signOut } from "@/auth";
import { ADMIN_ROUTES } from "@/utils/routes.const";
import { redirect } from "next/navigation";

// Dont call this function from /login route
export async function getSession() {
  const session = await auth();

  if (!session) {
    await signOut({ redirect: false });
    redirect(ADMIN_ROUTES.LOGIN);
  }
  return session;
}
