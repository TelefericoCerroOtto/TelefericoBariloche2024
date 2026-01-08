"use server";

import { updateActivityAdapter } from "@/lib/adapters";
import { getSession } from "@/lib/auth/get-session";
import { updateActivity } from "@/lib/services";

export const updateActivityAvailableStatusAction = async (
  documentId: string,
  available: boolean,
) => {
  try {
    const { jwt } = await getSession();
    const reqBody = updateActivityAdapter({ available });
    const res = await updateActivity({ reqBody, documentId }, jwt);

    if (!res.ok) {
      console.log("Failed to update activity available status: ", res.data);
      return {
        success: false,
        message: `Server action 'updateActivityAvailableStatusAction' failed: An error occurred while updating activity.`,
        data: res.data,
      };
    }

    return {
      success: true,
      message: "Activity available status successfully updated.",
    };
  } catch (error) {
    console.log("Error updating activity available status", error);
    return {
      success: false,
      message: `Error updating activity available status`,
    };
  }
};
