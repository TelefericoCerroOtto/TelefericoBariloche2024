"use client";

import { TableToolbarContainer } from "@/components";
import { ADMIN_ROUTES } from "@/lib/constants/routes.const";
import { Input } from "@heroui/react";
import { SearchIcon } from "lucide-react";

interface Props {
  // eslint-disable-next-line no-unused-vars
  onSearchChange: (value?: string) => void;
  onClear: () => void;
  filterValue: string;
}

export default function Filters(props: Props) {
  const { onSearchChange, onClear, filterValue } = props;

  return (
    <TableToolbarContainer
      linkHref={ADMIN_ROUTES.NEW_USER}
      title="Nuevo usuario"
    >
      <Input
        isClearable
        className="w-full max-w-[300px]"
        placeholder="Buscar por nombre..."
        startContent={<SearchIcon />}
        value={filterValue}
        onClear={() => onClear()}
        onValueChange={onSearchChange}
      />
    </TableToolbarContainer>
  );
}
