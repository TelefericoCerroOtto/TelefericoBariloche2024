"use server";

import { getServiceState, updateServiceState } from "@/lib/services/cms-collections/service-state";
import type { ServiceStateValues } from "@/types";
import { getSession } from "@/utils/auth";
import { CACHE_TAGS } from "@/utils/cache-tags.const";
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
