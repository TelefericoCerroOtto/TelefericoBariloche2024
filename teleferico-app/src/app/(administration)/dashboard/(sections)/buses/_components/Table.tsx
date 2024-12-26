"use client";

import { ButtonDos, TableContainer } from "@/components";
import { buttonStyles } from "@/components/ButtonDos";
import {
  Selection,
  Table as NextUITable,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@nextui-org/react";
import { Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type Key } from "react";
import Filters from "./Filters";
import { tableStyles } from "@/utils/styles";

const renderCell = (item: Item, columnKey: Key) => {
  const cellValue = item[columnKey as keyof Item];

  switch (columnKey) {
    case "depPoint":
      return <span>{cellValue as string}</span>;
    case "arrPoint":
      return <span>{cellValue as string}</span>;
    case "depTime":
      return <span>{new Date(cellValue).toLocaleDateString()}</span>;
    case "arrTime":
      return <span>{new Date(cellValue).toLocaleDateString()}</span>;
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

interface Item {
  id: number;
  depPoint: string;
  depUid: string;
  arrPoint: string;
  arrUid: string;
  depTime: Date;
  arrTime: Date;
}

const columns = [
  { key: "depPoint", label: "Lugar De Salida" },
  { key: "arrPoint", label: "Lugar De Llegada" },
  { key: "depTime", label: "Horario De Salida" },
  { key: "arrTime", label: "Horario De Llegada" },
  { key: "actions", label: "Acciones" },
];

const entries: Array<Item> = [
  {
    id: 1,
    depPoint: "Mitre y Villegas",
    depUid: "myv",
    arrPoint: "Base",
    arrUid: "base",
    depTime: new Date(),
    arrTime: new Date(),
  },
  {
    id: 2,
    depPoint: "Independencia y San Martin",
    depUid: "iysm",
    arrPoint: "Base",
    arrUid: "",
    depTime: new Date(),
    arrTime: new Date(),
  },
  {
    id: 3,
    depPoint: "Base",
    depUid: "base",
    arrPoint: "Mitre y Villegas",
    arrUid: "myv",
    depTime: new Date(),
    arrTime: new Date(),
  },
  {
    id: 4,
    depPoint: "Base",
    depUid: "base",
    arrPoint: "Independencia y San Martin",
    arrUid: "iysm",
    depTime: new Date(),
    arrTime: new Date(),
  },
];

// Esta info viene de la API
const options = [
  { name: "Mitre y Villegas", uid: "myv" },
  { name: "Base", uid: "base" },
  { name: "Independencia y San Martin", uid: "iysm" },
];

export default function Table() {
  const [departureFilter, setDepartureFilter] = useState<Selection>("all");
  const [arrivalFilter, setArrivalFilter] = useState<Selection>("all");

  const filteredItems = useMemo(() => {
    let filteredEntries = [...entries];

    if (
      departureFilter !== "all" &&
      Array.from(departureFilter).length !== options.length
    ) {
      filteredEntries = filteredEntries.filter((entry) =>
        Array.from(departureFilter).includes(entry.depUid),
      );
    }

    if (
      arrivalFilter !== "all" &&
      Array.from(arrivalFilter).length !== options.length
    ) {
      filteredEntries = filteredEntries.filter((entry) =>
        Array.from(arrivalFilter).includes(entry.arrUid),
      );
    }

    return filteredEntries;
  }, [departureFilter, arrivalFilter]);

  return (
    <>
      <Filters
        options={options}
        departureFilter={departureFilter}
        setDepartureFilter={setDepartureFilter}
        arrivalFilter={arrivalFilter}
        setArrivalFilter={setArrivalFilter}
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
