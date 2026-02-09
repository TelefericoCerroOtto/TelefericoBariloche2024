"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/constants/cache-tags.const";
import { updateActivityAdapter } from "@/lib/adapters";
import { getSession } from "@/lib/auth/get-session";
import { updateActivity } from "@/lib/services";
import { i18n } from "@/i18n";
import { PUBLIC_ROUTES } from "@/lib/constants/routes.const";

export const updateActivityStatusAction = async (
  documentId: string,
  data: Partial<{ available: boolean; isActive: boolean }>,
) => {
  try {
    const { jwt } = await getSession();
    const reqBody = updateActivityAdapter(data);

    const res = await updateActivity({ reqBody, documentId }, jwt);

    if (!res.ok) {
      console.log("Failed to update activity status: ", res.data);
      return { success: false, message: "Failed updating activity." };
    }

    // Revalidación: best-effort
    try {
      revalidateTag(CACHE_TAGS.ACTIVITIES);

      for (const locale of i18n.locales) {
        revalidatePath(`/${locale}${PUBLIC_ROUTES.ACTIVITIES}`);
      }
      // revalidatePath("/[locale]/(institutional)/activities", "page");
    } catch (e) {
      console.log("Cache revalidation failed (best-effort):", e); // No bloquea el success
    }

    return { success: true, message: "Activity status successfully updated." };
  } catch (error) {
    console.log("Error updating activity status", error);
    return { success: false, message: "Error updating activity status" };
  }
};
