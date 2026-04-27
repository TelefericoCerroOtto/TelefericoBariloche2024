"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/get-session";
import { PUBLIC_ROUTES } from "@/lib/constants/routes.const";
import { updateAccessTicket } from "@/lib/services";
import { i18n } from "@/i18n";
import type { Locales, UpdateAccessTicketRequest } from "@/types";

type TicketSortOrderUpdate = {
  documentId: string;
  sortOrder: number;
};

const ADMIN_REORDER_LOCALE: Locales = "es-AR";

export const reorderTicketsAction = async (tickets: TicketSortOrderUpdate[]) => {
  try {
    const { jwt } = await getSession();

    const results = await Promise.all(
      tickets.map(({ documentId, sortOrder }) => {
        const reqBody: UpdateAccessTicketRequest = {
          data: { sortOrder },
        };

        return updateAccessTicket(
          { reqBody, documentId, locale: ADMIN_REORDER_LOCALE },
          jwt,
        );
      }),
    );

    const failedResult = results.find((result) => !result.ok);

    if (failedResult) {
      console.log("Failed to reorder tickets: ", failedResult.data);
      return { success: false, message: "Failed reordering tickets." };
    }

    try {
      for (const locale of i18n.locales) {
        revalidatePath(`/${locale}${PUBLIC_ROUTES.PRICINGSCHEDULES}`);
      }
    } catch (error) {
      console.log("Tickets reorder revalidation failed (best-effort):", error);
    }

    return { success: true, message: "Tickets reordered successfully." };
  } catch (error) {
    console.log("Error reordering tickets", error);
    return { success: false, message: "Error reordering tickets" };
  }
};
