import { STRAPI_ENDPOINTS } from "@/lib/constants/routes.const";
import { strapiFetch } from "@/lib/http/clients/strapi-fetch";
import type { LoginFormData, SuccessfulLoginResponse, User } from "@/types";

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

export const verifySession = async (jwt: string) => {
  try {
    const res = await strapiFetch<Omit<User, "faved_postulations" | "role">>(
      { endpoint: STRAPI_ENDPOINTS.USERS_ME },
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      },
    );

    if (res.ok) return { isLogged: true };
    console.log("verify session failed: ", res.data);
    return { isLogged: false };
  } catch (error) {
    console.log("verify session error: ", error);
    return { isLogged: false };
  }
};
