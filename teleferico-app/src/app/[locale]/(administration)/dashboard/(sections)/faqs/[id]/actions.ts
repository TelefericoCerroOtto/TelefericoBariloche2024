"use server";

import { i18n } from "@/i18n";
import { updateFaqAdapter } from "@/lib/adapters";
import { updateFaqSchema } from "@/lib/schemas";
import { updateFaq } from "@/lib/services";
import { FormSubmitServerActionResponse, UpdateFaqFormData } from "@/types";
import { getSession } from "@/lib/auth/get-session";
import { ValidationError } from "yup";

const DEFAULT_ERROR_MESSAGE =
  "Server action 'updateFaqAction' failed: An unexpected error occurred.";

export const updateFaqAction = async (
  values: UpdateFaqFormData,
): FormSubmitServerActionResponse => {
  try {
    const { jwt } = await getSession();
    updateFaqSchema.validateSync(values);
    const { locales } = i18n;
    const { documentId } = values;

    for (let i = 0; i < locales.length; i++) {
      const locale = locales[i];

      const reqBody = updateFaqAdapter(values, locale);

      const res = await updateFaq({ reqBody, documentId, locale }, jwt);
      if (!res.ok) {
        return {
          success: false,
          message: `Server action 'updateFaqAction' failed: Can not update faq with documentId ${documentId} in locale ${locale}`,
          data: res.data,
        };
      }
    }

    return {
      success: true,
      message: "Faq successfully updated.",
      data: undefined,
    };
  } catch (error) {
    console.error("updateFaqAction error", error);

    if (error instanceof ValidationError) {
      return {
        success: false,
        message:
          "Server action 'updateFaqAction' failed: Invalid or missing fields.",
        data: error,
      };
    }

    return {
      success: false,
      message: DEFAULT_ERROR_MESSAGE,
      data: error,
    };
  }
};
