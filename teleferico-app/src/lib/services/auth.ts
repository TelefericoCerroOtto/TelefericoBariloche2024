import type { LoginFormData, SuccessfulLoginResponse } from "@/types";
import { fetchWrapper } from "@/utils/fetch";
import { getStrapiURL } from "@/utils/get-strapi-url";
import { STRAPI_ENDPOINTS } from "@/utils/routes.const";

export const login = async (values: LoginFormData) => {
  const res = fetchWrapper<SuccessfulLoginResponse>(
    getStrapiURL(STRAPI_ENDPOINTS.AUTH),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(values),
      cache: "no-cache",
    },
    "login service error",
  );

  return res;
};

export const verifySession = async (jwt: string) => {
  try {
    const res = await fetch(getStrapiURL(STRAPI_ENDPOINTS.USERS_ME), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
    });

    if (res.status === 200) return { isLogged: true };
    return { isLogged: false };
  } catch (error) {
    console.log("verify session error", error);
    return { isLogged: false };
  }
};
