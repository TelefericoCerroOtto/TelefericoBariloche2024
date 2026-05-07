"use client";

import {
  ADMIN_LOGIN_QUERY_PARAMS,
  ADMIN_LOGIN_REASONS,
  ADMIN_ROUTES,
  getAdminLoginUrl,
} from "@/lib/constants/routes.const";
import { signOut } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function Logout() {
  const searchParams = useSearchParams();
  const reason = searchParams.get(ADMIN_LOGIN_QUERY_PARAMS.REASON);

  const redirectTo =
    reason === ADMIN_LOGIN_REASONS.SESSION_EXPIRED
      ? getAdminLoginUrl(ADMIN_LOGIN_REASONS.SESSION_EXPIRED)
      : ADMIN_ROUTES.LOGIN;

  useEffect(() => {
    void signOut({ redirectTo });
  }, [redirectTo]);

  return <div />;
}
