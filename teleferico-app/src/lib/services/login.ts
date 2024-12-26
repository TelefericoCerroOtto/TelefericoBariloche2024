import type { ErrorResponse, SuccessfulLoginResponse } from "@/types/api";
import { LoginFormData } from "@/types/forms";
import { getStrapiURL } from "@/utils/get-strapi-url";

export const login = async (values: LoginFormData) => {
  try {
    const res = await fetch(`${getStrapiURL()}/api/auth/local`, {
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
