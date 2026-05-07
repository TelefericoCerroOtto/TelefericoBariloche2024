"use server";

import { i18n } from "@/i18n";
import {
  createZoneAdapter,
  createZoneTranslationAdapter,
  updateZoneTranslationAdapter,
} from "@/lib/adapters";
import { getSession } from "@/lib/auth/get-session";
import { createZoneSchema } from "@/lib/schemas";
import {
  createZone,
  createZoneTranslation,
  updateZoneTranslation,
} from "@/lib/services";
import { CreateZoneFormData, FormSubmitServerActionResponse } from "@/types";
import { ValidationError } from "yup";

const DEFAULT_ERROR_MESSAGE =
  "Server action 'createZoneAction' failed: An unexpected error occurred.";

export const createZoneAction = async (
  values: CreateZoneFormData,
): FormSubmitServerActionResponse => {
  try {
    const { jwt } = await getSession();
    createZoneSchema.validateSync(values);
    const { locales } = i18n;

    let zoneDocumentId: string = "";
    let zoneTranslationDocumentId: string = "";

    for (let i = 0; i < locales.length; i++) {
      const locale = locales[i];

      if (i === 0) {
        const zoneReqBody = createZoneAdapter(values);
        const zoneRes = await createZone({ reqBody: zoneReqBody }, jwt);

        if (!zoneRes.ok) {
          return {
            success: false,
            message: `Server action 'createZoneAction' failed: Can not create zone in locale ${locale}`,
            data: zoneRes.data,
          };
        }

        zoneDocumentId = zoneRes.data.data.documentId;

        const zoneTranslationReqBody = createZoneTranslationAdapter({
          zone: values,
          relatedZoneDocumentId: zoneDocumentId,
          locale,
        });
        const zoneTranslationRes = await createZoneTranslation(
          { reqBody: zoneTranslationReqBody, locale },
          jwt,
        );

        if (!zoneTranslationRes.ok) {
          return {
            success: false,
            message: `Server action 'createZoneAction' failed: Can not create zone translation in locale ${locale}`,
            data: zoneTranslationRes.data,
          };
        }

        zoneTranslationDocumentId = zoneTranslationRes.data.data.documentId;
      } else {
        const reqBody = updateZoneTranslationAdapter(
          { documentId: zoneDocumentId, zoneTranslationDocumentId, ...values },
          locale,
        );

        const res = await updateZoneTranslation(
          { reqBody, documentId: zoneTranslationDocumentId, locale },
          jwt,
        );

        if (!res.ok) {
          return {
            success: false,
            message: `Server action 'createZoneAction' failed: Can not update faq with documentId ${zoneDocumentId} in locale ${locale}`,
            data: res.data,
          };
        }
      }
    }

    return {
      success: true,
      message: "Zone successfully created",
      data: undefined,
    };
  } catch (error) {
    console.error("createZoneAction error", error);

    if (error instanceof ValidationError) {
      return {
        success: false,
        message:
          "Server action 'createZoneAction' failed: Invalid or missing fields.",
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
