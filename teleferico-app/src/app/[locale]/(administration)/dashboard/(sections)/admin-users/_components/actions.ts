"use server";

import { CACHE_TAGS } from "@/lib/constants/cache-tags.const";
import { blockUnblockUser, deleteUser } from "@/lib/services";
import { getSession } from "@/utils";
import { revalidateTag } from "next/cache";

export const blockAction = async (userId: number, isBlocked: boolean) => {
  const session = await getSession();
  const res = await blockUnblockUser(userId, session.jwt, !isBlocked);
  revalidateTag(CACHE_TAGS.USERS);
  return res;
};

export const deleteAction = async (userId: number) => {
  const session = await getSession();
  const res = await deleteUser(userId, session.jwt);
  revalidateTag(CACHE_TAGS.USERS);
  return res;
};
