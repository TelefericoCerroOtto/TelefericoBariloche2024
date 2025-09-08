"use server";

import { signOut } from "@/auth";
import { ADMIN_ROUTES } from "@/utils/routes.const";

export const logoutAction = async () => {
  await signOut({ redirectTo: ADMIN_ROUTES.LOGIN });
};
