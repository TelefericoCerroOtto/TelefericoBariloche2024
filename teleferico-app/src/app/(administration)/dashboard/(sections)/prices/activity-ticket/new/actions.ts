"use server";

import { i18n } from "@/i18n";
import {
  createActivityAdapter,
  createActivityTranslationAdapter,
  updateActivityTranslationAdapter,
} from "@/lib/adapters/forms";
import { newActivitySchema } from "@/lib/schemas/forms";
import { createActivity } from "@/lib/services";
import {
  createActivityTranslation,
  updateActivityTranslation,
} from "@/lib/services/activity-translations";
import type {
  FormSubmitServerActionResponse,
  NewActivityFormData,
} from "@/types";
import { getSession } from "@/utils/auth";
import { ValidationError } from "yup";

export const newActivityAction = async (
  values: NewActivityFormData,
): FormSubmitServerActionResponse => {
  const { jwt } = await getSession();
  const { locales } = i18n;

  try {
    newActivitySchema.validateSync(values);
    const createActivityReqBody = createActivityAdapter(values);

    const res = await createActivity(createActivityReqBody, jwt);

    if (!res.ok) {
      return {
        success: false,
        message:
          "Server action 'newActivityAction' failed: An error occurred while creating the new activity.",
        data: res.data,
      };
    }

    const activityDocumentId: string = res.data.data.documentId;
    let activityTranslationDocumentId: string = "";

    for (let i = 0; i < locales.length; i++) {
      const locale = locales[i];

      if (i === 0) {
        // for the first locale, create the activity translation
        const createActivityTranslationReqBody =
          createActivityTranslationAdapter({
            values,
            relatedActivityDocumentId: activityDocumentId,
            locale,
          });

        const res = await createActivityTranslation(
          { reqBody: createActivityTranslationReqBody, locale },
          jwt,
        );

        if (!res.ok) {
          return {
            success: false,
            message: `Server action 'newActivityAction' failed: An error occurred while creating locale ${locale} activity translation.`,
            data: res.data,
          };
        }

        activityTranslationDocumentId = res.data.data.documentId;
      } else {
        // for the rest of locales, update the activity translation
        const updateActivityTranslationReqBody =
          updateActivityTranslationAdapter({
            values: {
              ...values,
              activityDocumentId,
              activityTranslationDocumentId,
            },
            locale,
          });

        const res = await updateActivityTranslation(
          {
            reqBody: updateActivityTranslationReqBody,
            documentId: activityTranslationDocumentId,
            locale,
          },
          jwt,
        );

        if (!res.ok) {
          return {
            success: false,
            message: `Server action 'newActivityAction' failed: An error occurred while updating locale ${locale} activity translation.`,
            data: res.data,
          };
        }
      }
    }

    return {
      success: true,
      message: "New activity successfully created.",
    };
  } catch (error) {
    console.log("Server action 'newActivityAction' error: ", error);

    if (error instanceof ValidationError) {
      return {
        success: false,
        message:
          "Server action 'newActivityAction' failed: Invalid or missing fields.",
      };
    }

    return {
      success: false,
      message: "Server action 'newActivityAction' failed",
    };
  }
};
