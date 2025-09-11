"use server";

import { updateBusTripAdapter } from "@/lib/adapters";
import { createBusTripSchema } from "@/lib/schemas";
import { updateBusTrip } from "@/lib/services";
import type {
  FormSubmitServerActionResponse,
  UpdateBusTripFormData,
} from "@/types";
import { getSession } from "@/utils";
import { ValidationError } from "yup";

export const updateBusTripAction = async (
  values: UpdateBusTripFormData,
): FormSubmitServerActionResponse => {
  const { jwt } = await getSession();

  try {
    createBusTripSchema.validateSync(values);
    const reqBody = updateBusTripAdapter(values);

    const res = await updateBusTrip(
      { reqBody, documentId: values.documentId },
      jwt,
    );

    if (!res.ok) {
      return {
        success: false,
        message:
          "Server action 'updateBusTripAction' failed: An error occurred while updating the new bus trip.",
        data: res.data,
      };
    }

    return {
      success: true,
      message: "Bus trip successfully updated.",
    };
  } catch (error) {
    console.log("Server action 'updateBusTripAction' error: ", error);

    if (error instanceof ValidationError) {
      return {
        success: false,
        message:
          "Server action 'updateBusTripAction' failed: Invalid or missing fields.",
      };
    }

    return {
      success: false,
      message: "Server action 'updateBusTripAction' failed",
    };
  }
};
