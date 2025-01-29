"use client";

import { logoutAction } from "./actions";
import { useEffect, useRef } from "react";

// Logout page will autosubmit a signout form, which deletes Authjs session.

export default function LogoutForm() {
  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    if (formRef.current) {
      formRef.current.requestSubmit();
    }
  }, []);

  return <form ref={formRef} action={logoutAction} />;
}
