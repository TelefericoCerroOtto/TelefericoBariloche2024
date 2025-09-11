"use server";

import { createBusTripAdapter } from "@/lib/adapters";
import { createBusTripSchema } from "@/lib/schemas";
import { createBusTrip } from "@/lib/services";
import type {
  CreateBusTripFormData,
  FormSubmitServerActionResponse,
} from "@/types";
import { getSession } from "@/utils";
import { ValidationError } from "yup";

export const createBusTripAction = async (
  values: CreateBusTripFormData,
): FormSubmitServerActionResponse => {
  const { jwt } = await getSession();

  try {
    createBusTripSchema.validateSync(values);
    const reqBody = createBusTripAdapter(values);

    const res = await createBusTrip(reqBody, jwt);

    if (!res.ok) {
      return {
        success: false,
        message:
          "Server action 'createBusTripAction' failed: An error occurred while creating the new bus trip.",
        data: res.data,
      };
    }

    return {
      success: true,
      message: "New activity successfully created.",
    };
  } catch (error) {
    console.log("Server action 'createBusTripAction' error: ", error);

    if (error instanceof ValidationError) {
      return {
        success: false,
        message:
          "Server action 'createBusTripAction' failed: Invalid or missing fields.",
      };
    }

    return {
      success: false,
      message: "Server action 'createBusTripAction' failed",
    };
  }
};
