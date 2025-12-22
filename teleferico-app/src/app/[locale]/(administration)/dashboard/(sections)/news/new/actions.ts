"use server";

import { i18n } from "@/i18n";
import { createNewsAdapter, updateNewsAdapter } from "@/lib/adapters";
import { createNewSchema } from "@/lib/schemas";
import { createNew, updateNew, uploadImage } from "@/lib/services";
import type {
  CreateNewFormData,
  FormSubmitServerActionResponse,
} from "@/types";
import { getSession } from "@/lib/auth/get-session";
import { ValidationError } from "yup";

const DEFAULT_ERROR_MESSAGE =
  "Server action 'createNewsAction' failed: An unexpected error occurred.";

export const createNewsAction = async (
  values: CreateNewFormData,
): FormSubmitServerActionResponse => {
  try {
    const { jwt } = await getSession();
    createNewSchema.validateSync(values);
    const { newCoverImageFile } = values;
    const { locales } = i18n;

    if (!newCoverImageFile) {
      return {
        success: false,
        message: "No cover image file uploaded",
        data: undefined,
      };
    }

    const res = await uploadImage(newCoverImageFile, jwt);

    if (!res.ok) {
      console.log("Failed to upload image at createNewsAction: ", res.data);
      return {
        success: false,
        message:
          "Server action 'createNewsAction' failed: Can not upload image",
        data: res.data,
      };
    }
    const coverImageId = res.data[0].id;
    let documentId: string = "";

    for (let i = 0; i < locales.length; i++) {
      const locale = locales[i];
      if (i === 0) {
        const reqBody = createNewsAdapter({
          values: {
            ...values,
            coverImageId,
          },
        });

        const res = await createNew({ reqBody, locale }, jwt);

        if (!res.ok) {
          return {
            success: false,
            message: `Server action 'createNewsAction' failed: Can not create news in locale ${locale}`,
            data: res.data,
          };
        }

        documentId = res.data.data.documentId;
      } else {
        const reqBody = updateNewsAdapter({
          values: {
            ...values,
            coverImageId,
          },
          locale,
        });

        const res = await updateNew({ reqBody, documentId, locale }, jwt);
        if (!res.ok) {
          return {
            success: false,
            message: `Server action 'createNewsAction' failed: Can not update new with documentId ${documentId} in locale ${locale}`,
            data: res.data,
          };
        }
      }
    }

    return {
      success: true,
      message: "News successfully created",
      data: undefined,
    };
  } catch (error) {
    console.error("createNewsAction error", error);

    if (error instanceof ValidationError) {
      return {
        success: false,
        message:
          "Server action 'createNewsAction' failed: Invalid or missing fields.",
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
