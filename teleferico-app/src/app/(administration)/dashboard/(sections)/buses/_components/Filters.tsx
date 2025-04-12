"use client";

import { TableToolbarContainer } from "@/components";
import { ADMIN_ROUTES } from "@/utils/routes.const";
import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Selection,
} from "@nextui-org/react";
import { ChevronDownIcon } from "lucide-react";
import { Dispatch, SetStateAction } from "react";

interface Props {
  departureFilter: Selection;
  setDepartureFilter: Dispatch<SetStateAction<Selection>>;
  arrivalFilter: Selection;
  setArrivalFilter: Dispatch<SetStateAction<Selection>>;
  options: Array<{ name: string; uid: string }>;
}

export default function Filters(props: Props) {
  const {
    departureFilter,
    setDepartureFilter,
    arrivalFilter,
    setArrivalFilter,
    options,
  } = props;

  return (
    <TableToolbarContainer
      linkHref={ADMIN_ROUTES.NEW_BUS_TRAVEL}
      title="Nueva Ruta"
    >
      <Dropdown>
        <DropdownTrigger className="sm:flex">
          <Button
            endContent={<ChevronDownIcon className="text-small" />}
            size="sm"
            variant="flat"
          >
            Lugares De Salida
          </Button>
        </DropdownTrigger>
        <DropdownMenu
          disallowEmptySelection
          aria-label="Table Columns"
          closeOnSelect={false}
          selectedKeys={departureFilter}
          selectionMode="multiple"
          onSelectionChange={setDepartureFilter}
        >
          {options.map((status) => (
            <DropdownItem key={status.uid} className="capitalize">
              {status.name}
            </DropdownItem>
          ))}
        </DropdownMenu>
      </Dropdown>
      <Dropdown>
        <DropdownTrigger className="sm:flex">
          <Button
            endContent={<ChevronDownIcon className="text-small" />}
            size="sm"
            variant="flat"
          >
            Lugares De Llegada
          </Button>
        </DropdownTrigger>
        <DropdownMenu
          disallowEmptySelection
          aria-label="Table Columns"
          closeOnSelect={false}
          selectedKeys={arrivalFilter}
          selectionMode="multiple"
          onSelectionChange={setArrivalFilter}
        >
          {options.map((status) => (
            <DropdownItem key={status.uid} className="capitalize">
              {status.name}
            </DropdownItem>
          ))}
        </DropdownMenu>
      </Dropdown>
    </TableToolbarContainer>
  );
}
