"use client";

import ButtonDos from "@/components/ui/ButtonDos";
import { signOut } from "next-auth/react";

export default function LogoutButton() {
  return (
    <ButtonDos
      onClick={async () => {
        void signOut({ callbackUrl: "http://localhost:3000/login" });
      }}
    >
      Logout
    </ButtonDos>
  );
}
