"use server";

import { newUserAdapter } from "@/lib/adapters/forms";
import { createUser, updateUser } from "@/lib/services";
import type { NewUserFormData, UpdateUserFormData } from "@/types/forms";
import { getSession } from "@/utils/auth";
import { CACHE_TAGS } from "@/utils/cache-tags.const";
import { filterDifferences } from "@/utils/clean-object";
import { revalidateTag } from "next/cache";

export const createUserAction = async (user: NewUserFormData) => {
  const session = await getSession();
  const adaptedUser = newUserAdapter(user);
  const res = await createUser(adaptedUser, session.jwt);
  revalidateTag(CACHE_TAGS.USERS);

  return res;
};

export const updateUserAction = async (
  prevValues: UpdateUserFormData,
  postValues: UpdateUserFormData,
) => {
  const session = await getSession();
  const filteredUser = filterDifferences(
    prevValues,
    postValues,
  ) as UpdateUserFormData;

  const res = await updateUser(
    prevValues.id,
    session.jwt,
    JSON.stringify(filteredUser),
  );
  revalidateTag(CACHE_TAGS.USERS);

  return res;
};
