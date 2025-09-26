"use server";

import { i18n } from "@/i18n";
import { patchNewsAdapter } from "@/lib/adapters";
import { newsFormSchema } from "@/lib/schemas";
import { deleteNews, updateNews, uploadMedia } from "@/services";
import type {
  FormSubmitServerActionResponse,
  NewsFormData,
} from "@/types";
import { ValidationError } from "yup";

const DEFAULT_UPDATE_ERROR =
  "Server action 'updateNewsAction' failed: An unexpected error occurred.";

export const updateNewsAction = async (
  values: NewsFormData,
): FormSubmitServerActionResponse => {
  try {
    const formValues: NewsFormData = {
      ...values,
      coverImageFile: values.coverImageFile ?? null,
    };

    if (formValues.coverImageFile instanceof File) {
      const uploadRes = await uploadMedia(formValues.coverImageFile);

      if (!uploadRes.ok) {
        return {
          success: false,
          message: DEFAULT_UPDATE_ERROR,
          data: uploadRes.data,
        };
      }

      const uploaded = uploadRes.data?.[0];
      if (!uploaded?.documentId) {
        return {
          success: false,
          message: DEFAULT_UPDATE_ERROR,
        };
      }

      formValues.coverImage = uploaded.documentId;
      formValues.coverImageUrl = uploaded.url ?? "";
    }

    formValues.coverImageFile = null;

    newsFormSchema.validateSync(formValues, { abortEarly: false });

    if (!formValues.documentId) {
      return {
        success: false,
        message:
          "Server action 'updateNewsAction' failed: Missing news identifier.",
      };
    }

    const locales = i18n.locales;

    for (let index = 0; index < locales.length; index++) {
      const locale = locales[index];
      const payload = patchNewsAdapter(formValues, locale);
      const res = await updateNews(formValues.documentId, payload, {
        locale,
      });

      if (!res.ok) {
        return {
          success: false,
          message:
            index === 0
              ? DEFAULT_UPDATE_ERROR
              : `Server action 'updateNewsAction' failed while updating locale ${locale}.`,
          data: res.data,
        };
      }
    }

    return {
      success: true,
      message: "Noticia actualizada correctamente.",
    };
  } catch (error) {
    console.error("updateNewsAction error", error);

    if (error instanceof ValidationError) {
      return {
        success: false,
        message:
          "Server action 'updateNewsAction' failed: Invalid or missing fields.",
      };
    }

    return {
      success: false,
      message: DEFAULT_UPDATE_ERROR,
    };
  }
};

export const deleteNewsAction = async (
  documentId: string,
): FormSubmitServerActionResponse => {
  try {
    const res = await deleteNews(documentId);

    if (!res.ok) {
      return {
        success: false,
        message:
          "Server action 'deleteNewsAction' failed: An unexpected error occurred.",
        data: res.data,
      };
    }

    return {
      success: true,
      message: "Noticia eliminada correctamente.",
    };
  } catch (error) {
    console.error("deleteNewsAction error", error);
    return {
      success: false,
      message:
        "Server action 'deleteNewsAction' failed: An unexpected error occurred.",
    };
  }
};
