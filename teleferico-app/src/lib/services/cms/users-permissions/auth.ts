import { STRAPI_ENDPOINTS } from "@/lib/constants/routes.const";
import { strapiFetch } from "@/lib/http/clients/strapi-fetch";
import { stringifyQuery } from "@/utils/query";
import type {
  LoginFormData,
  SuccessfulLoginResponse,
  User,
  UserRole,
} from "@/types";

export type VerifiedSessionUser = {
  readonly blocked: boolean;
  readonly role: UserRole;
};

export type VerifiedSession =
  | { readonly isLogged: false }
  | { readonly isLogged: true; readonly user: VerifiedSessionUser };

export const login = async (values: LoginFormData) => {
  const res = strapiFetch<SuccessfulLoginResponse>(
    { endpoint: STRAPI_ENDPOINTS.AUTH },
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(values),
      cache: "no-cache",
    },
    { skipToken: true, errorMsg: "login service error" },
  );

  return res;
};

export const verifySession = async (jwt: string): Promise<VerifiedSession> => {
  try {
    const res = await strapiFetch<User>(
      {
        endpoint: STRAPI_ENDPOINTS.USERS_ME,
        qp: stringifyQuery({ populate: "role" }),
      },
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      },
    );

    if (
      res.ok &&
      res.data.blocked === false &&
      res.data.role &&
      typeof res.data.role.name === "string"
    ) {
      return {
        isLogged: true,
        user: {
          blocked: false,
          role: res.data.role,
        },
      };
    }
    console.log("verify session failed: ", res.data);
    return { isLogged: false };
  } catch (error) {
    console.log("verify session error: ", error);
    return { isLogged: false };
  }
};
