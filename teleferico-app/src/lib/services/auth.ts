import type { ErrorResponse, SuccessfulLoginResponse } from "@/types/api";
import { LoginFormData } from "@/types/forms";
import { getStrapiURL } from "@/utils/get-strapi-url";
import { STRAPI_ENDPOINTS } from "@/utils/routes.const";

export const login = async (values: LoginFormData) => {
  try {
    const res = await fetch(getStrapiURL(STRAPI_ENDPOINTS.AUTH), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(values),
    });

    if (res.status === 200) {
      const data = await res.json();
      return { ok: true, data } as { ok: true; data: SuccessfulLoginResponse };
    }

    const data = await res.json();
    return { ok: false, data } as { ok: false; data: ErrorResponse };
  } catch (error) {
    console.log("service 'login' error ", error);
    return { ok: false, data: null } as { ok: false; data: null };
  }
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
