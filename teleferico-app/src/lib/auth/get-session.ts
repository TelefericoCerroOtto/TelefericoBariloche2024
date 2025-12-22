import { ADMIN_ROUTES } from "@/lib/constants/routes.const";
import { redirect } from "next/navigation";

// Dont call this function from /login route
export async function getSession() {
  const { auth, signOut } = await import("@/auth");
  const session = await auth();

  if (!session) {
    await signOut({ redirect: false });
    redirect(ADMIN_ROUTES.LOGIN);
  }
  return session;
}
