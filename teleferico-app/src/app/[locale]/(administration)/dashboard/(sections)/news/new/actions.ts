"use server";

import { i18n } from "@/i18n";
import { patchNewsAdapter, postNewsAdapter } from "@/lib/adapters";
import { newsFormSchema } from "@/lib/schemas";
import { createNews, updateNews } from "@/services";
import type {
  FormSubmitServerActionResponse,
  NewsFormData,
} from "@/types";
import { ValidationError } from "yup";

const DEFAULT_ERROR_MESSAGE =
  "Server action 'createNewsAction' failed: An unexpected error occurred.";

export const createNewsAction = async (
  values: NewsFormData,
): FormSubmitServerActionResponse => {
  try {
    newsFormSchema.validateSync(values, { abortEarly: false });

    const locales = i18n.locales;
    let documentId = "";

    for (let index = 0; index < locales.length; index++) {
      const locale = locales[index];

      if (index === 0) {
        const payload = postNewsAdapter(values, locale);
        const res = await createNews(payload);

        if (!res.ok) {
          return {
            success: false,
            message: DEFAULT_ERROR_MESSAGE,
            data: res.data,
          };
        }

        documentId = res.data.data.documentId;
      } else {
        const payload = patchNewsAdapter(values, locale);
        const res = await updateNews(documentId, payload, { locale });

        if (!res.ok) {
          return {
            success: false,
            message: `Server action 'createNewsAction' failed while updating locale ${locale}.`,
            data: res.data,
          };
        }
      }
    }

    return {
      success: true,
      message: "Noticia creada correctamente.",
    };
  } catch (error) {
    console.error("createNewsAction error", error);

    if (error instanceof ValidationError) {
      return {
        success: false,
        message:
          "Server action 'createNewsAction' failed: Invalid or missing fields.",
      };
    }

    return {
      success: false,
      message: DEFAULT_ERROR_MESSAGE,
    };
  }
};
