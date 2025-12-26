"use server";

import { updateZoneAdapter } from "@/lib/adapters";
import { updateZone } from "@/lib/services";
import { getSession } from "@/lib/auth/get-session";

export const updateZoneOpenStatusAction = async (
  documentId: string,
  isOpen: boolean,
) => {
  try {
    const { jwt } = await getSession();
    const adaptedZone = updateZoneAdapter({ isOpen });
    const res = await updateZone({ reqBody: adaptedZone, documentId }, jwt);

    if (!res.ok) {
      console.log("Failed to update zone open status: ", res.data);
      return {
        success: false,
        message: `Server action 'updateZoneOpenStatusAction' failed: An error occurred while updating zone.`,
        data: res.data,
      };
    }

    return {
      success: true,
      message: "Zone open status successfully updated.",
    };
  } catch (error) {
    console.log("Error updating zone open status", error);
    return {
      success: false,
      message: `Error updating zone open status`,
    };
  }
};

export const updateZoneFeaturedStatusAction = async (
  documentId: string,
  featured: boolean,
) => {
  try {
    const { jwt } = await getSession();
    const adaptedZone = updateZoneAdapter({ featured });
    const res = await updateZone({ reqBody: adaptedZone, documentId }, jwt);

    if (!res.ok) {
      console.log("Failed to update zone open status: ", res.data);
      return {
        success: false,
        message: `Server action 'updateZoneFeaturedStatusAction' failed: An error occurred while updating zone.`,
        data: res.data,
      };
    }

    return {
      success: true,
      message: "Zone open status successfully updated.",
    };
  } catch (error) {
    console.log("Error updating zone open status", error);
    return {
      success: false,
      message: `Error updating zone open status`,
    };
  }
};
