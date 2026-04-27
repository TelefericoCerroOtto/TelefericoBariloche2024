"use server";

import { revalidatePath } from "next/cache";
import { updateZoneAdapter } from "@/lib/adapters";
import { updateZone } from "@/lib/services";
import { getSession } from "@/lib/auth/get-session";
import { i18n } from "@/i18n";
import { PUBLIC_ROUTES } from "@/lib/constants/routes.const";
import type { UpdateZoneRequest } from "@/types";

type ZoneSortOrderUpdate = {
  documentId: string;
  sortOrder: number;
};

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

export const updateZoneSchedulesVisibilityAction = async (
  documentId: string,
  isVisible: boolean,
) => {
  try {
    const { jwt } = await getSession();
    const adaptedZone = updateZoneAdapter({ hide: !isVisible });
    const res = await updateZone({ reqBody: adaptedZone, documentId }, jwt);

    if (!res.ok) {
      console.log("Failed to update zone schedules visibility: ", res.data);
      return {
        success: false,
        message: `Server action 'updateZoneSchedulesVisibilityAction' failed: An error occurred while updating zone visibility.`,
        data: res.data,
      };
    }

    return {
      success: true,
      message: "Zone schedules visibility successfully updated.",
    };
  } catch (error) {
    console.log("Error updating zone schedules visibility", error);
    return {
      success: false,
      message: `Error updating zone schedules visibility`,
    };
  }
};

export const reorderZonesAction = async (zones: ZoneSortOrderUpdate[]) => {
  try {
    const { jwt } = await getSession();

    const results = await Promise.all(
      zones.map(({ documentId, sortOrder }) => {
        const reqBody: UpdateZoneRequest = {
          data: { sortOrder },
        };

        return updateZone({ reqBody, documentId }, jwt);
      }),
    );

    const failedResult = results.find((result) => !result.ok);

    if (failedResult) {
      console.log("Failed to reorder zones: ", failedResult.data);
      return { success: false, message: "Failed reordering zones." };
    }

    try {
      for (const locale of i18n.locales) {
        revalidatePath(`/${locale}${PUBLIC_ROUTES.PRICINGSCHEDULES}`);
      }
    } catch (error) {
      console.log("Zones reorder revalidation failed (best-effort):", error);
    }

    return { success: true, message: "Zones reordered successfully." };
  } catch (error) {
    console.log("Error reordering zones", error);
    return {
      success: false,
      message: "Error reordering zones",
    };
  }
};
