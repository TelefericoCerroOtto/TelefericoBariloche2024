"use client";

import { type Key } from "react";
import DataTable from "./DataTable";

interface Zone {
  id: number;
  zoneName: string;
  openTime: Date;
  closeTime: Date;
}

const columns: Array<{ key: keyof Zone; label: string }> = [
  { key: "zoneName", label: "Sector" },
  { key: "openTime", label: "Apertura" },
  { key: "closeTime", label: "Cierre" },
];

const items: Zone[] = [
  {
    id: 1,
    zoneName: "Base",
    openTime: new Date(1995, 11, 17, 10, 0, 0),
    closeTime: new Date(1995, 11, 17, 16, 30, 0),
  },
  {
    id: 2,
    zoneName: "Parque Exterior",
    openTime: new Date(1995, 11, 17, 9, 30, 0),
    closeTime: new Date(1995, 11, 17, 17, 0, 0),
  },
  {
    id: 3,
    zoneName: "Cumbre",
    openTime: new Date(1995, 11, 17, 9, 30, 0),
    closeTime: new Date(1995, 11, 17, 17, 45, 0),
  },
  {
    id: 4,
    zoneName: "Cabaña Informativa (Mitre Y Villegas)",
    openTime: new Date(1995, 11, 17, 9, 30, 0),
    closeTime: new Date(1995, 11, 17, 16, 0, 0),
  },
  {
    id: 5,
    zoneName: "Cabaña Informativa (Independencia Y Av. San Martin)",
    openTime: new Date(1995, 11, 17, 9, 30, 0),
    closeTime: new Date(1995, 11, 17, 16, 0, 0),
  },
];

export const renderCell = (zone: Zone, columnKey: Key) => {
  const cellValue = zone[columnKey as keyof Zone];

  switch (columnKey) {
    case "zoneName":
      return <span>{cellValue as string}</span>;
    case "openTime":
      return <span>{(cellValue as Date).toTimeString().slice(0, 5)}hs</span>;
    case "closeTime":
      return <span>{(cellValue as Date).toTimeString().slice(0, 5)}hs</span>;

    default:
      return <span>{cellValue as string}</span>;
  }
};

const TITLE = "Ascenso y Descenso - Teleférico Cerro Otto + Acceso al Complejo";
const DESC =
  "El ascenso y descenso en el teleférico es solo el comienzo de una experiencia inolvidable. Disfrutá de un recorrido panorámico que te lleva directo al complejo turístico en la cima, donde te esperan actividades para todas las edades.";

export default function ZonesTable() {
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
