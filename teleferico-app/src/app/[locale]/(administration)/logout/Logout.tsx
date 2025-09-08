"use client";

import { ADMIN_ROUTES } from "@/utils";
import { signOut } from "next-auth/react";
import { useEffect } from "react";

export default function Logout() {
  useEffect(() => {
    signOut({ redirectTo: ADMIN_ROUTES.LOGIN });
  }, []);

  return <div />;
}
