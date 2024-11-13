"use server";

import { signIn } from "@/auth";
import type { LoginUserRequest } from "@/types/api";

export async function authenticate({ identifier, password }: LoginUserRequest) {
  try {
    // En caso de que este todo ok, devuelve el valor de "redirectTo"
    // Caso contrario
    const res = await signIn("credentials", {
      identifier,
      password,
      callbackUrl: "/dashboard",
      redirect: false,
      redirectTo: "/dashboard",
    });

    return res;
  } catch (error: any) {
    console.log("authenticate action error", error);
    if (error.code === "invalid_credentials") {
      return { error: "Mail o contraseña incorrectos" };
    } else if (error.code === "unhandled_error") {
      throw Error("Failed to authenticate");
    }
  }
}

export async function signInAction(formData: FormData) {
  console.log("signIn form data", formData);
}
