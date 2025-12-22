"use client";

import { ADMIN_ROUTES } from "@/lib/constants/routes.const";
import { signOut, useSession } from "next-auth/react";
import { useEffect } from "react";

export default function SessionWatcher() {
  const { status } = useSession();

  useEffect(() => {
    if (status === "unauthenticated") {
      // If the session expired while on dashboard, redirect to login immediately
      // signOut also clears any persisted state and lets middleware keep things in sync
      void signOut({ redirectTo: ADMIN_ROUTES.LOGIN });
    }
  }, [status]);

  return null;
}
