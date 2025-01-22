import type { ErrorResponse, UserResponse, UserRole } from "@/types/api";
import { getStrapiURL } from "@/utils/get-strapi-url";

export const getUserRole = async (jwt: string) => {
  try {
    const res = await fetch(`${getStrapiURL()}/api/users/me?populate=role`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
    });

    if (res.status === 200) {
      const data = (await res.json()) as UserResponse & { role: UserRole };
      return { ok: true, data: data.role } as { ok: true; data: UserRole };
    }

    const data = await res.json();
    return { ok: false, data } as { ok: false; data: ErrorResponse };
  } catch (error) {
    console.log("get user role error", error);
    return { ok: false, data: null } as { ok: false; data: null };
  }
};
