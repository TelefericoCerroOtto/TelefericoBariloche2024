"use client";

import { buttonStyles } from "@/components/ButtonDos";
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
import Link from "next/link";
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
    <div className="py-auto flex h-12 w-full items-center justify-between gap-8 overflow-scroll border-b border-b-foreground-300 bg-white px-3">
      <div className="flex gap-6">
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
      </div>
      <Link
        href={ADMIN_ROUTES.NEW_BUS_TRAVEL}
        className={buttonStyles({ className: "min-w-[80px]", intent: "solid" })}
      >
        Nueva Ruta
      </Link>
    </div>
  );
}
