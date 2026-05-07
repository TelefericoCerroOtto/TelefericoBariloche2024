"use client";

import { TableToolbarContainer } from "@/components";
import { ADMIN_ROUTES } from "@/lib/constants/routes.const";

export default function Toolbar() {
  return (
    <TableToolbarContainer
      linkHref={ADMIN_ROUTES.NEW_BUS_TRIP}
      title="Nueva Ruta"
    >
      <></>
    </TableToolbarContainer>
  );
}
