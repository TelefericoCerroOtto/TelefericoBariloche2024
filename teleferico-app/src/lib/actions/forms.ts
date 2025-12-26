"use server";

// TODO: Encontrar una nueva distribucion de estas funciones en archivos mejor organizados

import { signIn } from "@/auth";
import { getSession } from "@/lib/auth/get-session";
import { STRAPI_ENDPOINTS } from "@/lib/constants/routes.const";
import { getUsers } from "@/lib/services";
import type { GetZonesResponse, LoginUserRequest } from "@/types";
import { stringifyQuery } from "@/utils";
import { AuthError } from "next-auth";
import { strapiFetch } from "../http/clients/strapi-fetch";

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

export const validateZoneLabelAvailability = async (
  label: string,
): Promise<boolean> => {
  const normalized = label.trim();

  const query = { filters: { label: { $eq: normalized } } };
  const res = await strapiFetch<GetZonesResponse>({
    endpoint: STRAPI_ENDPOINTS.ZONES,
    qp: stringifyQuery(query),
  });

  if (!res.ok) {
    throw new Error("Failed to validate label availability");
  }

  return res.data.data.length === 0;
};
