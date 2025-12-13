import type {
  DeleteUserResponse,
  FetchResponse,
  GetPersonalDataResponse,
  GetRolesResponse,
  GetUserResponse,
  GetUsersResponse,
  NewUserRequest,
  NewUserResponse,
  UpdateUserResponse,
  UserRole,
  UserRoles,
} from "@/types";
import { strapiFetch } from "@/lib/http/clients/strapi-fetch";
import { CACHE_TAGS } from "@/utils/cache-tags.const";
import { getStrapiURL } from "@/utils/get-strapi-url";
import { stringifyQuery } from "@/utils/query";
import { STRAPI_ENDPOINTS } from "@/utils/routes.const";

export const getPersonalData = async (jwt: string) => {
  const query = { populate: "*" };

  const res = await strapiFetch<GetPersonalDataResponse>(
    getStrapiURL(STRAPI_ENDPOINTS.USERS_ME, stringifyQuery(query)),
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
      cache: "no-cache",
    },
    "getPersonalData error",
  );
  return res;
};

export const getUsers = async (jwt: string, qs?: unknown) => {
  const notEqualRole: UserRoles = "Administrator";

  const query = {
    populate: "role",
    filters: {
      role: {
        name: {
          $ne: notEqualRole,
        },
      },
    },
  };

  const res = await strapiFetch<GetUsersResponse>(
    getStrapiURL(STRAPI_ENDPOINTS.USERS, stringifyQuery(qs ?? query)),
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
      cache: "no-cache",
      next: { tags: [CACHE_TAGS.USERS] },
    },
    "get users error",
  );

  return res;
};

export const getUserRole = async (userId: string, jwt: string) => {
  const query = { populate: "role" };

  const res = await strapiFetch<GetUserResponse>(
    getStrapiURL(`${STRAPI_ENDPOINTS.USERS}/${userId}`, stringifyQuery(query)),
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
      cache: "no-cache",
    },
    "get user role error",
  );

  let sanitizedRes: FetchResponse<UserRole>;

  if (res.ok) sanitizedRes = { ok: res.ok, data: res.data.role };
  else sanitizedRes = { ok: res.ok, data: res.data };

  return sanitizedRes;
};

export const getUserData = async (userId: string, jwt: string) => {
  const query = { populate: "role" };

  const res = await strapiFetch<GetUserResponse>(
    getStrapiURL(`${STRAPI_ENDPOINTS.USERS}/${userId}`, stringifyQuery(query)),
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
      cache: "no-cache",
    },
    "get user role error",
  );

  return res;
};

export const createUser = async (user: NewUserRequest, jwt: string) => {
  const res = await strapiFetch<NewUserResponse>(
    getStrapiURL(STRAPI_ENDPOINTS.USERS),
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(user),
    },
  );

  return res;
};

export const updateUser = async (
  userId: number,
  jwt: string,
  bodyContent: BodyInit,
) => {
  const res = await strapiFetch<UpdateUserResponse>(
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
    "update user error",
  );

  return res;
};

export const blockUnblockUser = async (
  userId: number,
  jwt: string,
  blocked: boolean,
) => {
  const bodyContent = JSON.stringify({ blocked });
  console.log("bodyContent", bodyContent);
  return await updateUser(userId, jwt, bodyContent);
};

export const deleteUser = async (userId: number, jwt: string) => {
  const res = await strapiFetch<DeleteUserResponse>(
    getStrapiURL(`${STRAPI_ENDPOINTS.USERS}/${userId}`),
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
    },
    "delete user error",
  );

  return res;
};

export const getRoles = async (jwt: string) => {
  const res = await strapiFetch<GetRolesResponse>(
    getStrapiURL(STRAPI_ENDPOINTS.ROLES),
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
      cache: "no-cache",
    },
    "get roles error",
  );
  // It is not possible to filter the returned roles through query parameters.
  // The roles controller is configured to return all roles.
  const excludedRoles: UserRoles[] = [
    "Public",
    "Authenticated",
    "Administrator",
  ];

  let sanitizedRes: FetchResponse<UserRole[]>;

  if (res.ok) {
    sanitizedRes = {
      ok: res.ok,
      data: res.data.roles.filter((role) => !excludedRoles.includes(role.name)),
    };
  } else sanitizedRes = { ok: res.ok, data: res.data };

  return sanitizedRes;
};
