"use server";

import { getSession } from "@/lib/auth/get-session";
import { CACHE_TAGS } from "@/lib/constants/cache-tags.const";
import { getServiceState, updateServiceState } from "@/lib/services";
import type { ServiceStateValues } from "@/types";
import { revalidateTag } from "next/cache";

export const getStateAction = async () => {
  return await getServiceState();
};

export const updateStateAction = async (state: ServiceStateValues) => {
  const session = await getSession();
  const res = await updateServiceState(state, session.jwt);
  revalidateTag(CACHE_TAGS.SERVICE_STATE);
  return res;
};
