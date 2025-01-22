"use server";

import { signIn } from "@/auth";
import type { LoginUserRequest } from "@/types/api";
import { AuthError } from "next-auth";

export const loginAction = async (data: LoginUserRequest) => {
  try {
    const res = await signIn("credentials", {
      ...data,
      redirect: false,
    });
    return res;
  } catch (error) {
    console.log("loginAction error", error);

    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Credenciales invalidas" };

        default:
          return { error: "Error inesperado" };
      }
    }
  }
};
