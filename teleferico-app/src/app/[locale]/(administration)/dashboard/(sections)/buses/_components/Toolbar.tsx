"use client";

import { TableToolbarContainer } from "@/components";
import { ADMIN_ROUTES } from "@/utils";
import { Selection } from "@heroui/react";
import { Dispatch, SetStateAction } from "react";
// import Filters from "./Filters";

interface Props {
  departureFilter?: Selection;
  setDepartureFilter?: Dispatch<SetStateAction<Selection>>;
  arrivalFilter?: Selection;
  setArrivalFilter?: Dispatch<SetStateAction<Selection>>;
  options?: Array<{ name: string; uid: string }>;
}

// eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
export default function Toolbar(props: Props) {
  return (
    <TableToolbarContainer
      linkHref={ADMIN_ROUTES.NEW_BUS_TRIP}
      title="Nueva Ruta"
    >
      <></>
      {/* <Filters {...props} /> */}
    </TableToolbarContainer>
  );
}
