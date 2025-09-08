"use server";

import { getServiceState, updateServiceState } from "@/lib/services";
import type { ServiceStateValues } from "@/types";
import { CACHE_TAGS, getSession } from "@/utils";
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
