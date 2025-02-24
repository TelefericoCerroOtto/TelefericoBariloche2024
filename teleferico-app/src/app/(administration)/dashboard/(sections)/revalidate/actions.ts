"use server";

import { revalidateTag } from "next/cache";

export const revalidate = async (formData: FormData) => {
  const tag = formData.get("tag") as string;
  revalidateTag(tag);
  alert("etiqueta revalidada");
};
