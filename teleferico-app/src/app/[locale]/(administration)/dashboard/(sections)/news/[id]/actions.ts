"use server";

import { i18n } from "@/i18n";
import { updateNewsAdapter } from "@/lib/adapters";
import { updateNewSchema } from "@/lib/schemas";
import { updateNew, uploadImage } from "@/lib/services";
import { deleteNew } from "@/lib/services";
import type {
  FormSubmitServerActionResponse,
  UpdateNewFormData,
} from "@/types";
import { getSession } from "@/utils";
import { ValidationError } from "yup";

const DEFAULT_UPDATE_ERROR =
  "Server action 'updateNewsAction' failed: An unexpected error occurred.";

export const updateNewsAction = async (
  values: UpdateNewFormData,
): FormSubmitServerActionResponse => {
  try {
    const { jwt } = await getSession();
    updateNewSchema.validateSync(values);
    const { newCoverImageFile, documentId } = values;

    let coverImageId;

    if (newCoverImageFile) {
      const res = await uploadImage(newCoverImageFile, jwt);
      if (!res.ok) {
        console.log("Failed to upload image at updateNewsAction: ", res.data);
        return {
          success: false,
          message:
            "Server action 'updateNewsAction' failed: Cannot upload image",
        };
      }
      coverImageId = res.data[0].id;
    }

    for (let i = 0; i < i18n.locales.length; i++) {
      const locale = i18n.locales[i];
      const adaptedNewReqBody = updateNewsAdapter({
        values: { ...values, coverImageId },
        locale,
      });

      const res = await updateNew(
        { reqBody: adaptedNewReqBody, documentId, locale },
        jwt,
      );

      if (!res.ok) {
        console.log(
          `Failed to update new with documentId ${documentId} in locale ${locale}: `,
          res.data,
        );
        return {
          success: false,
          message:
            "Server action 'updateNewsAction' failed: Cannot update the news",
          data: res.data?.error,
        };
      }
    }

    return {
      success: true,
      message: "News successfully updated",
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
    const { jwt } = await getSession();
    const res = await deleteNew(documentId, jwt);

    if (!res.ok) {
      return {
        success: false,
        message: `Server action 'deleteNewsAction' failed: Cannot delete new with documentId ${documentId}.`,
        data: res.data,
      };
    }

    return {
      success: true,
      message: "Noticia eliminada correctamente",
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
