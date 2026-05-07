"use server";

import { updateBusTripAdapter } from "@/lib/adapters";
import { getSession } from "@/lib/auth/get-session";
import { updateBusTrip } from "@/lib/services";

export const updateVisibleStatusAction = async (
  documentId: string,
  data: { isVisible: boolean },
) => {
  try {
    const { jwt } = await getSession();
    const reqBody = updateBusTripAdapter(data);

    const res = await updateBusTrip({ reqBody, documentId }, jwt);

    if (!res.ok) {
      console.log("Failed to update bus trip visibility status: ", res.data);
      return {
        success: false,
        message: "Failed updating bus trip visibility status.",
      };
    }

    return {
      success: true,
      message: "Bus trip visibility status successfully updated.",
    };
  } catch (error) {
    console.log("Error updating bus trip visibility status", error);
    return {
      success: false,
      message: "Error updating bus trip visibility status",
    };
  }
};
