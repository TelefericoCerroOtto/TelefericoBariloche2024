"use server";

import { i18n } from "@/i18n";
import {
  updateZoneAdapter,
  updateZoneTranslationAdapter,
} from "@/lib/adapters";
import { updateZoneSchema } from "@/lib/schemas";
import { updateZone, updateZoneTranslation } from "@/lib/services";
import type { FormSubmitServerActionResponse, ZoneFormData } from "@/types";
import { getSession } from "@/utils";
import { ValidationError } from "yup";

export const updateZoneAction = async (
  values: ZoneFormData,
): FormSubmitServerActionResponse => {
  const { jwt } = await getSession();
  const { locales } = i18n;

  try {
    updateZoneSchema.validateSync(values);

    const documentId: string = values.documentId;
    const zoneTrasnlationDocumentId: string = values.zoneTrasnlationDocumentId;

    const adaptedZone = updateZoneAdapter(values);
    const res = await updateZone({ reqBody: adaptedZone, documentId }, jwt);

    if (!res.ok) {
      console.log(res.data);
      return {
        success: false,
        message: `Server action 'updateZoneAction' failed: An error occurred while updating zone.`,
        data: res.data,
      };
    }

    for (let i = 0; i < locales.length; i++) {
      const locale = locales[i];

      const adaptedZoneTranslation = updateZoneTranslationAdapter(
        values,
        locale,
      );
      const res = await updateZoneTranslation(
        {
          reqBody: adaptedZoneTranslation,
          documentId: zoneTrasnlationDocumentId,
          locale,
        },
        jwt,
      );

      if (!res.ok) {
        console.log(res.data);
        return {
          success: false,
          message: `Server action 'updateZoneAction' failed: An error occurred while updating locale ${locale} zone translation.`,
          data: res.data,
        };
      }
    }

    return {
      success: true,
      message: "Zone successfully updated.",
    };
  } catch (error) {
    console.log("Server action 'updateZoneAction' error: ", error);
    if (error instanceof ValidationError) {
      return {
        success: false,
        message:
          "Server action 'updateZoneAction' failed: Invalid or missing fields.",
      };
    }
    return {
      success: false,
      message: "Server action 'updateZoneAction' failed",
    };
  }
};
