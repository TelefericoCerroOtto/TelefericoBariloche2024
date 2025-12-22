"use server";

import { signIn } from "@/auth";
import { getSession } from "@/lib/auth/get-session";
import { getUsers } from "@/lib/services";
import type { LoginUserRequest } from "@/types";
import { AuthError } from "next-auth";

export const loginAction = async (data: LoginUserRequest) => {
  try {
    // TODO: CUANDO SE CIERRA SESION DE MANERA AUTOMATICA POR LA OPCION session.maxAge, y se vuelve a utilizar signIn, esta devuelve undefined
    const res = await signIn("credentials", {
      ...data,
      redirect: false,
    });

    return res;
  } catch (error) {
    console.log("login action error: ", error);
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: error.message };

        default:
          return { error: "Error inesperado" };
      }
    }
  }
};

// This function is necessary because the server does not correctly
// validate whether the submitted username already exists while using the REST API.
export const validateUsernameAvailability = async (username: string) => {
  const session = await getSession();
  const query = { filters: { username: { $eq: username } } };
  const res = await getUsers(session.jwt, query);
  if (res.ok) return res.data.length === 0;
  return false;
};

export const validateEmailAvailability = async (email: string) => {
  const session = await getSession();
  const query = { filters: { email: { $eq: email } } };
  const res = await getUsers(session.jwt, query);
  if (res.ok) return res.data.length === 0;
  return false;
};
