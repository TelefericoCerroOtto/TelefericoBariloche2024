"use client";

import { useEffect, useRef } from "react";
import { formsubmit } from "./action";

// Logout page will autosubmit a signout form, which deletes Authjs session.

export default function LogoutForm() {
  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    if (formRef.current) {
      formRef.current.requestSubmit();
    }
  }, []);

  return <form ref={formRef} action={formsubmit} />;
}
