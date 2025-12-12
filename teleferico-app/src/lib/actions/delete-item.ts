"use server";

import { ENV_KEYS } from "@/lib/constants/env.const";
import { FormSubmitServerActionResponse } from "@/types";
import { getSession } from "@/utils";
import { assertEnv } from "@/utils/env";

export const deleteItemAction = async (
  path: string,
  documentId: string,
): FormSubmitServerActionResponse => {
  assertEnv([ENV_KEYS.BUILD_STRAPI_BASE_URL]);
  const strapiBaseUrl = process.env[ENV_KEYS.BUILD_STRAPI_BASE_URL];

  const session = await getSession();

  const res = await fetch(`${strapiBaseUrl}${path}/${documentId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${session.jwt}`,
    },
  });

  if (!res.ok) {
    const data = await res.json();
    return {
      success: false,
      message: "The item could not be deleted",
      data,
    };
  }

  return {
    success: true,
    message: "Item deleted",
    data: undefined,
  };
};
