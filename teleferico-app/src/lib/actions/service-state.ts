"use server";

import { getServiceState } from "@/lib/services";

export const getStateAction = async () => {
  return await getServiceState();
};
