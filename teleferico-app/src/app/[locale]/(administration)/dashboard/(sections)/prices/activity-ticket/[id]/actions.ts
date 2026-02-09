"use server";

import { i18n } from "@/i18n";
import {
  createActivityTranslationAdapter,
  updateActivityAdapter,
  updateActivityTranslationAdapter,
} from "@/lib/adapters";
import { updateActivitySchema } from "@/lib/schemas";
import {
  createActivityTranslation,
  updateActivity,
  updateActivityTranslation,
} from "@/lib/services";
import type {
  FormSubmitServerActionResponse,
  UpdateActivityFormData,
} from "@/types";
import { getSession } from "@/lib/auth/get-session";
import { ValidationError } from "yup";

export const updateActivityAction = async (
  values: UpdateActivityFormData,
): FormSubmitServerActionResponse => {
  const { jwt } = await getSession();
  const { locales } = i18n;

  try {
    updateActivitySchema.validateSync(values);

    const { activityDocumentId } = values;
    let { activityTranslationDocumentId } = values;
    const reqBody = updateActivityAdapter(values);
    const res = await updateActivity(
      { reqBody, documentId: activityDocumentId },
      jwt,
    );

    if (!res.ok) {
      console.log("Activity update error at updateActivityAction: ", res.data);
      return {
        success: false,
        message: `Server action 'updateActivityAction' failed: An error occurred while updating activity.`,
        data: res.data,
      };
    }

    for (let i = 0; i < locales.length; i++) {
      const locale = locales[i];
      if (i == 0 && !activityTranslationDocumentId) {
        // guard in case activityTranslationDocumentId is missing for the first locale
        const localeReqBody = createActivityTranslationAdapter({
          values,
          locale,
          relatedActivityDocumentId: activityDocumentId,
        });

        const res = await createActivityTranslation(
          {
            reqBody: localeReqBody,
            locale,
          },
          jwt,
        );

        if (!res.ok) {
          console.log(
            "Create activity translation at updateActivityAction failed: ",
            res.data,
          );
          return {
            success: false,
            message: `Server action 'updateActivityAction' failed: An error occurred while updating locale ${locale} activity translation.`,
            data: res.data,
          };
        }

        activityTranslationDocumentId = res.data.data.documentId;
      } else {
        const localeReqBody = updateActivityTranslationAdapter({
          values,
          locale,
        });

        const res = await updateActivityTranslation(
          {
            reqBody: localeReqBody,
            documentId: activityTranslationDocumentId!,
            locale,
          },
          jwt,
        );

        if (!res.ok) {
          console.log(
            "Update activity translation at updateActivityAction failed: ",
            res.data,
          );
          return {
            success: false,
            message: `Server action 'updateActivityAction' failed: An error occurred while updating locale ${locale} activity translation.`,
            data: res.data,
          };
        }
      }
    }

    return {
      success: true,
      message: "Activity updated successfully.",
      data: undefined,
    };
  } catch (error) {
    console.log("Server action 'updateActivityAction' error: ", error);
    if (error instanceof ValidationError) {
      return {
        success: false,
        message:
          "Server action 'updateActivityAction' failed: Invalid or missing fields.",
        data: error,
      };
    }
    return {
      success: false,
      message: "Server action 'updateActivityAction' failed",
      data: error,
    };
  }
};
