"use server";

import { i18n } from "@/i18n";
import { createFaqAdapter, updateFaqAdapter } from "@/lib/adapters";
import { createFaqSchema } from "@/lib/schemas";
import { createFaq, updateFaq } from "@/lib/services";
import { CreateFaqFormData, FormSubmitServerActionResponse } from "@/types";
import { getSession } from "@/utils";
import { ValidationError } from "yup";

const DEFAULT_ERROR_MESSAGE =
  "Server action 'createFaqAction' failed: An unexpected error occurred.";

export const createFaqAction = async (
  values: CreateFaqFormData,
): FormSubmitServerActionResponse => {
  try {
    const { jwt } = await getSession();
    createFaqSchema.validateSync(values);
    const { locales } = i18n;

    let documentId: string = "";

    for (let i = 0; i < locales.length; i++) {
      const locale = locales[i];
      if (i === 0) {
        const reqBody = createFaqAdapter(values, locale);

        const res = await createFaq({ reqBody, locale }, jwt);

        if (!res.ok) {
          return {
            success: false,
            message: `Server action 'createFaqAction' failed: Can not create faq in locale ${locale}`,
            data: res.data,
          };
        }

        documentId = res.data.data.documentId;
      } else {
        const reqBody = updateFaqAdapter(values, locale);

        const res = await updateFaq({ reqBody, documentId, locale }, jwt);
        if (!res.ok) {
          return {
            success: false,
            message: `Server action 'createFaqAction' failed: Can not update faq with documentId ${documentId} in locale ${locale}`,
            data: res.data,
          };
        }
      }
    }

    return {
      success: true,
      message: "Faq successfully created",
      data: undefined,
    };
  } catch (error) {
    console.error("createFaqAction error", error);

    if (error instanceof ValidationError) {
      return {
        success: false,
        message:
          "Server action 'createFaqAction' failed: Invalid or missing fields.",
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
