"use client";

import { TableContainer } from "@/components";
import { tableStyles } from "@/lib/constants/styles.const";
import type { UserResponse, UserRole } from "@/types";
import {
  Table as NextUITable,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  User,
} from "@heroui/react";
import { type Key } from "react";
import { columns } from "../data";
import ActionButtons from "./ActionButtons";
import Filters from "./Filters";
import { useFilters } from "./use-filters";

const renderCell = (user: UserResponse<{ role: UserRole }>, columnKey: Key) => {
  switch (columnKey) {
    case "name":
      return (
        <User
          avatarProps={{
            radius: "lg",
            src: "https://i.pravatar.cc/150?u=a042581f4e29026704d",
          }}
          description={user.email}
          name={`${user.name} ${user.surname}`}
        >
          {user.email}
        </User>
      );

    case "role":
      return <span>{user.role.name}</span>;

    case "email":
      return <span>{user.email}</span>;
    case "actions":
      return <ActionButtons user={user} />;
    default:
      return <span>{}</span>;
  }
};

interface Props {
  users: UserResponse<{ role: UserRole }>[];
}

export default function UsersAdminTable(props: Props) {
  const { users } = props;
  const { filterValue, filteredItems, onSearchChange, onSearchClear } =
    useFilters<UserResponse<{ role: UserRole }>>(users);

  return (
    <>
      <Filters
        onSearchChange={onSearchChange}
        onClear={onSearchClear}
        filterValue={filterValue}
      />
      <TableContainer>
        <NextUITable {...tableStyles}>
          <TableHeader columns={columns}>
            {(column) => (
              <TableColumn key={column.key}>{column.label}</TableColumn>
            )}
          </TableHeader>
          <TableBody
            emptyContent={"No hay usuarios para mostrar"}
            items={filteredItems}
          >
            {(entry) => (
              <TableRow key={entry.id}>
                {(columnKey) => (
                  <TableCell>{renderCell(entry, columnKey)}</TableCell>
                )}
              </TableRow>
            )}
          </TableBody>
        </NextUITable>
      </TableContainer>
    </>
  );
}
