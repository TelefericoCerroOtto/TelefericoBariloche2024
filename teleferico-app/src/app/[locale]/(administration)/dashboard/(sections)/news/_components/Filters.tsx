"use client";

import { TableToolbarContainer } from "@/components";
import { ADMIN_ROUTES } from "@/lib/constants/routes.const";
import { Input, Switch } from "@heroui/react";
import { SearchIcon } from "lucide-react";
import type { ComponentProps } from "react";

type InputValueChangeHandler = NonNullable<
  ComponentProps<typeof Input>["onValueChange"]
>;
type SwitchValueChangeHandler = NonNullable<
  ComponentProps<typeof Switch>["onValueChange"]
>;

interface Props {
  filterValue: string;
  onSearchChange: InputValueChangeHandler;
  onSearchClear: () => void;
  dateValue: string;
  onDateChange: InputValueChangeHandler;
  onDateClear: () => void;
  highlightedOnly: boolean;
  onHighlightedChange: SwitchValueChangeHandler;
}

export default function Filters(props: Props) {
  const {
    filterValue,
    onSearchChange,
    onSearchClear,
    dateValue,
    onDateChange,
    onDateClear,
    highlightedOnly,
    onHighlightedChange,
  } = props;

  return (
    <TableToolbarContainer
      linkHref={ADMIN_ROUTES.NEW_NEWS}
      title="Nueva noticia"
    >
      <div className="flex items-center gap-4">
        <Input
          isClearable
          className="w-full max-w-[260px]"
          placeholder="Buscar por título..."
          startContent={<SearchIcon />}
          value={filterValue}
          onClear={onSearchClear}
          onValueChange={onSearchChange}
        />
        <Input
          type="date"
          label="Fecha"
          labelPlacement="outside"
          className="w-full max-w-[160px]"
          value={dateValue}
          onValueChange={(value) => {
            if (value) {
              onDateChange(value);
            } else {
              onDateClear();
            }
          }}
          onClear={onDateClear}
          isClearable
        />
        <Switch
          isSelected={highlightedOnly}
          onValueChange={onHighlightedChange}
          color="primary"
        >
          Solo destacadas
        </Switch>
      </div>
    </TableToolbarContainer>
  );
}
