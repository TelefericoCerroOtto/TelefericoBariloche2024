"use server";

import { i18n } from "@/i18n";
import { updateFaqAdapter } from "@/lib/adapters";
import { updateFaq } from "@/lib/services";
import { getSession } from "@/lib/auth/get-session";

export const updateFaqFeaturedStatus = async (
  documentId: string,
  nextValue: boolean,
) => {
  try {
    const { jwt } = await getSession();
    const locale = i18n.defaultLocale;
    const adaptedFaq = updateFaqAdapter({ featured: nextValue }, locale);
    const res = await updateFaq(
      { reqBody: adaptedFaq, documentId, locale },
      jwt,
    );

    if (!res.ok) {
      console.log("Failed to update faq featured status: ", res.data);
      return {
        success: false,
        message: `Server action 'updateFaqFeaturedStatus' failed: An error occurred while updating faq.`,
        data: res.data,
      };
    }

    return {
      success: true,
      message: "Faq featured status successfully updated.",
    };
  } catch (error) {
    console.log("Error updating faq featured status", error);
    return {
      success: false,
      message: `Error updating faq featured status`,
    };
  }
};
