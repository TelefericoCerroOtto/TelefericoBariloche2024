import type {
  ErrorResponse,
  GetPersonalDataResponse,
  GetUsersResponse,
  QueriedUser,
  UnpopulatedUserResponse,
  UserRole,
} from "@/types/api";
import { getStrapiURL } from "@/utils/get-strapi-url";
import { stringifyQuery } from "@/utils/query";
import { STRAPI_ENDPOINTS } from "@/utils/routes.const";

export const getPersonalData = async (jwt: string) => {
  const query = { populate: "*" };

  try {
    const res = await fetch(
      getStrapiURL(STRAPI_ENDPOINTS.USERS_ME, stringifyQuery(query)),
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
        cache: "no-cache",
      },
    );

    if (res.status === 200) {
      const data = (await res.json()) as GetPersonalDataResponse;
      return { ok: true, data };
    }

    const data = await res.json();
    return { ok: false, data } as { ok: false; data: ErrorResponse };
  } catch (error) {
    console.log("get personal data error", error);
    return { ok: false, data: null } as { ok: false; data: null };
  }
};

export const getUsers = async (jwt: string) => {
  const query = {
    populate: {
      role: {
        fields: ["name", "description"],
      },
    },
    filters: {
      role: {
        name: {
          $ne: "AdminMaster",
        },
      },
    },
    fields: ["name", "surname", "email", "blocked"],
  };

  try {
    const res = await fetch(
      getStrapiURL(STRAPI_ENDPOINTS.USERS, stringifyQuery(query)),
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
        cache: "no-cache",
      },
    );

    if (res.status === 200) {
      const data = (await res.json()) as GetUsersResponse;
      return { ok: true, data };
    }

    const data = await res.json();
    return { ok: false, data } as { ok: false; data: ErrorResponse };
  } catch (error) {
    console.log("get users error", error);
    return { ok: false, data: null } as { ok: false; data: null };
  }
};

export const getUserRole = async (userId: string, jwt: string) => {
  const query = { populate: "role" };

  try {
    const res = await fetch(
      getStrapiURL(
        `${STRAPI_ENDPOINTS.USERS}/${userId}`,
        stringifyQuery(query),
      ),
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
        cache: "no-cache",
      },
    );

    if (res.status === 200) {
      const data = (await res.json()) as QueriedUser;
      return { ok: true, data: data.role } as { ok: true; data: UserRole };
    }

    const data = await res.json();
    return { ok: false, data } as { ok: false; data: ErrorResponse };
  } catch (error) {
    console.log("get user role error", error);
    return { ok: false, data: null } as { ok: false; data: null };
  }
};

export const getUserData = async (userId: string, jwt: string) => {
  const query = { populate: "role" };

  try {
    const res = await fetch(
      getStrapiURL(
        `${STRAPI_ENDPOINTS.USERS}/${userId}`,
        stringifyQuery(query),
      ),
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
        cache: "no-cache",
      },
    );

    if (res.status === 200) {
      const data = (await res.json()) as UnpopulatedUserResponse & {
        role: UserRole;
      };
      return { ok: true, data };
    }

    const data = await res.json();
    return { ok: false, data } as { ok: false; data: ErrorResponse };
  } catch (error) {
    console.log("get user role error", error);
    return { ok: false, data: null } as { ok: false; data: null };
  }
};

export const updateUser = async (
  userId: string,
  jwt: string,
  bodyContent: BodyInit,
) => {
  try {
    const res = await fetch(
      getStrapiURL(`${STRAPI_ENDPOINTS.USERS}/${userId}`),
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${jwt}`,
          "Content-Type": "application/json",
        },
        body: bodyContent,
        cache: "no-cache",
      },
    );

    if (res.status === 200) {
      const data = (await res.json()) as GetUsersResponse;
      return { ok: true, data };
    }

    const data = await res.json();
    return { ok: false, data } as { ok: false; data: ErrorResponse };
  } catch (error) {
    console.log("get users error", error);
    return { ok: false, data: null } as { ok: false; data: null };
  }
};

export const blockUser = async (
  userId: string,
  jwt: string,
  blocked: boolean,
) => {
  const bodyContent = JSON.stringify({ blocked });
  return await updateUser(userId, jwt, bodyContent);
};
