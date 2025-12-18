"use server";

import { i18n } from "@/i18n";
import { updateAccessTicketSchema } from "@/lib/schemas";
import { updateAccessTicket } from "@/lib/services";
import type {
  FormSubmitServerActionResponse,
  UpdateAccessTicketFormData,
} from "@/types";
import { getSession } from "@/utils";
import { ValidationError } from "yup";

export const updateTicketAction = async (
  values: UpdateAccessTicketFormData,
): FormSubmitServerActionResponse => {
  const { jwt } = await getSession();
  const { locales } = i18n;

  try {
    updateAccessTicketSchema.validateSync(values);

    const documentId: string = values.documentId;

    for (let i = 0; i < locales.length; i++) {
      const locale = locales[i];
      const data = {
        lifting_mean: values.liftingMean,
        price: values.price,
        name: values[`accessName_${locale}`],
      };

      const res = await updateAccessTicket(
        { reqBody: { data }, documentId, locale },
        jwt,
      );

      if (!res.ok) {
        console.log(res.data);
        return {
          success: false,
          message: `Server action 'updateTicketAction' failed: An error occurred while updating locale ${locale} access ticket.`,
          data: res.data,
        };
      }
    }

    return {
      success: true,
      message: "Access ticket successfully updated.",
      data: undefined,
    };
  } catch (error) {
    console.log("Server action 'updateTicketAction' error: ", error);
    if (error instanceof ValidationError) {
      return {
        success: false,
        message:
          "Server action 'updateTicketAction' failed: Invalid or missing fields.",
        data: error,
      };
    }
    return {
      success: false,
      message: "Server action 'updateTicketAction' failed",
      data: error,
    };
  }
};
