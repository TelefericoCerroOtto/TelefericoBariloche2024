"use server";

import { i18n } from "@/i18n";
import { createAccessTicketSchema } from "@/lib/schemas";
import { createAccessTicket, updateAccessTicket } from "@/lib/services";
import type {
  CreateAccessTicketFormData,
  FormSubmitServerActionResponse,
} from "@/types";
import { getSession } from "@/lib/auth/get-session";
import { ValidationError } from "yup";

export const newTicketAction = async (
  values: CreateAccessTicketFormData,
): FormSubmitServerActionResponse => {
  const { jwt } = await getSession();
  const { locales } = i18n;

  try {
    createAccessTicketSchema.validateSync(values);

    let documentId: string = "";

    for (let i = 0; i < locales.length; i++) {
      const locale = locales[i];
      const data = {
        lifting_mean: values.liftingMean,
        price: values.price,
        name: values[`accessName_${locale}`],
      };

      if (i === 0) {
        const res = await createAccessTicket({ data }, jwt);

        if (!res.ok) {
          console.log(res.data);
          return {
            success: false,
            message:
              "Server action 'newTicketAction' failed: An error occurred while creating the new access ticket.",
            data: res.data,
          };
        }

        documentId = res.data.data.documentId;
      } else {
        const res = await updateAccessTicket(
          { reqBody: { data }, documentId, locale },
          jwt,
        );

        if (!res.ok) {
          console.log(res.data);
          return {
            success: false,
            message: `Server action 'newTicketAction' failed: An error occurred while updating locale ${locale} access ticket.`,
            data: res.data,
          };
        }
      }
    }

    return {
      success: true,
      message: "New access ticket successfully created.",
      data: undefined,
    };
  } catch (error) {
    console.log("Server action 'newTicketAction' error: ", error);
    if (error instanceof ValidationError) {
      return {
        success: false,
        message:
          "Server action 'newTicketAction' failed: Invalid or missing fields.",
        data: error,
      };
    }
    return {
      success: false,
      message: "Server action 'newTicketAction' failed",
      data: error,
    };
  }
};
