"use client";

import { ADMIN_ROUTES } from "@/utils";
import { signOut } from "next-auth/react";
import { useEffect } from "react";
import { useSession } from "next-auth/react";

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

