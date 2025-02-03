"use client";

import { type Key } from "react";
import DataTable from "./DataTable";

interface Bus {
  id: number;
  depPoint: string;
  arrPoint: string;
  depTime: Date;
  arrTime: Date;
}

const columns: Array<{ key: keyof Bus; label: string }> = [
  { key: "depPoint", label: "Sector" },
  { key: "arrPoint", label: "Apertura" },
  { key: "depTime", label: "Cierre" },
  { key: "arrTime", label: "Cierre" },
];

const items: Bus[] = [
  {
    id: 1,
    depPoint: "Centro",
    arrPoint: "Base",
    depTime: new Date(1995, 11, 17, 10, 0, 0),
    arrTime: new Date(1995, 11, 17, 10, 15, 0),
  },
  {
    id: 2,
    depPoint: "Base",
    arrPoint: "Centro",
    depTime: new Date(1995, 11, 17, 11, 15, 0),
    arrTime: new Date(1995, 11, 17, 11, 30, 0),
  },
];

export const renderCell = (bus: Bus, columnKey: Key) => {
  const cellValue = bus[columnKey as keyof Bus];

  switch (columnKey) {
    case "depPoint":
      return <span>{cellValue as string}</span>;
    case "arrPoint":
      return <span>{cellValue as string}</span>;
    case "depTime":
      return <span>{(cellValue as Date).toTimeString().slice(0, 5)}hs</span>;
    case "arrTime":
      return <span>{(cellValue as Date).toTimeString().slice(0, 5)}hs</span>;

    default:
      return <span>{cellValue as string}</span>;
  }
};

const TITLE = "Buses (Traslado gratuito)";
const DESC =
  "Nuestros buses están disponibles durante todo el año para llevarte a tu destino de manera cómoda y segura. Consultá los horarios y planificá tu viaje con nosotros, sea cual sea la temporada.";

export default function BussTable() {
  return (
    <DataTable
      title={TITLE}
      desc={DESC}
      renderCell={renderCell}
      items={items}
      columns={columns}
    />
  );
}
