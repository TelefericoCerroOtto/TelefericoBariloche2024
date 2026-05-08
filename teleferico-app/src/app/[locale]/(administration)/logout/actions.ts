"use server";

import { signOut } from "@/auth";
import { getAdminLoginUrl } from "@/lib/constants/routes.const";

export const logoutAction = async () => {
  await signOut({ redirectTo: getAdminLoginUrl() });
};
