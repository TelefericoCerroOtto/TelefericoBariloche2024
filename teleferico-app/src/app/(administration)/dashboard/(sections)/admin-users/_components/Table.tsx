"use client";

import { ButtonDos, TableContainer } from "@/components";
import { buttonStyles } from "@/components/ButtonDos";
import { tableStyles } from "@/utils/styles";
import {
  Link,
  Table as NextUITable,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  User,
} from "@nextui-org/react";
import { Pencil, Trash2 } from "lucide-react";
import { type Key } from "react";
import Filters from "./Filters";
import { useFilters } from "./use-filters";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

const renderCell = (user: User, columnKey: Key) => {
  const cellValue = user[columnKey as keyof User];

  switch (columnKey) {
    case "name":
      return (
        <User
          avatarProps={{ radius: "lg", src: "MF" }}
          description={user.email}
          name={cellValue}
        >
          {user.email}
        </User>
      );

    case "role":
      return <span>{cellValue as string}</span>;

    case "email":
      return <span>{cellValue as string}</span>;
    case "actions":
      return (
        <div className="relative flex items-center gap-2">
          <Link href="#" className={buttonStyles({ intent: "ghostBlack" })}>
            <Pencil size={20} />
            <p>Editar</p>
          </Link>
          <ButtonDos intent="ghost" size="sm">
            <Trash2 size={20} />
            <p>Borrar</p>
          </ButtonDos>
        </div>
      );
    default:
      return <span>{cellValue as string}</span>;
  }
};

const columns = [
  { key: "name", label: "Nombre Completo" },
  { key: "email", label: "Email" },
  { key: "role", label: "Rol" },
  { key: "actions", label: "Acciones" },
];

const users: Array<User> = [
  {
    id: 1,
    name: "Juan Ignacio Gonzalez",
    email: "juani@gmail.com",
    role: "Administrativo",
  },
  {
    id: 2,
    name: "Mateo Pedro Quiroga",
    email: "mateo@gmail.com",
    role: "Administrativo",
  },
  {
    id: 3,
    name: "Sofia Mariana Lopez",
    email: "sofia.lopez@gmail.com",
    role: "Fotografo",
  },
  {
    id: 4,
    name: "Lucia Paula Sacha",
    email: "lucia.sacha@gmail.com",
    role: "Reclutador",
  },
  {
    id: 5,
    name: "Manuel Facundo Bosco",
    email: "manuel@gmail.com",
    role: "Administrador",
  },
];

export default function Table() {
  const { filterValue, filteredItems, onSearchChange, onSearchClear } =
    useFilters<User>(users);

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
            emptyContent={"No hay zonas para mostrar"}
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
