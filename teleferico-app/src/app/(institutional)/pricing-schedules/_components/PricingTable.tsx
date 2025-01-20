"use client";

import { type Key } from "react";
import DataTable from "./DataTable";

interface Price {
  id: number;
  ticketType: string;
  means: string;
  price: number;
}

const columns: Array<{ key: keyof Price; label: string }> = [
  { key: "ticketType", label: "Tipo de ticket" },
  { key: "means", label: "Medio" },
  { key: "price", label: "Precio por persona" },
];

const items: Price[] = [
  {
    id: 1,
    ticketType: "Ascenso y Descenso - Mayores (13 años en adelante)",
    means: "Teleférico",
    price: 25000,
  },
  {
    id: 2,
    ticketType: "Ascenso y Descenso - Menores (6 a 12 años)",
    means: "Teleférico",
    price: 15000,
  },
  {
    id: 3,
    ticketType: "Ascenso y Descenso - Tercera Edad (65 años y más)",
    means: "Teleférico",
    price: 15000,
  },
  {
    id: 4,
    ticketType: "Solo Ascenso",
    means: "Teleférico",
    price: 15000,
  },
  {
    id: 5,
    ticketType: "Menores de hasta 5 años",
    means: "Teleférico",
    price: 0,
  },
  {
    id: 6,
    ticketType: "Acceso por Camino (vehículo propio/caminata + funicular)",
    means: "Camino y funicular",
    price: 20000,
  },
];

export const renderCell = (price: Price, columnKey: Key) => {
  const cellValue = price[columnKey as keyof Price];

  switch (columnKey) {
    case "ticketType":
      return <span>{cellValue as string}</span>;
    case "means":
      return <span>{cellValue as string}</span>;
    case "price":
      if (cellValue === 0) return <span>Sin cargo</span>;
      return <span>${cellValue as string}</span>;

    default:
      return <span>{cellValue as string}</span>;
  }
};

const TITLE = "Ascenso y Descenso - Teleférico Cerro Otto + Acceso al Complejo";
const DESC =
  "El ascenso y descenso en el teleférico es solo el comienzo de una experiencia inolvidable. Disfrutá de un recorrido panorámico que te lleva directo al complejo turístico en la cima, donde te esperan actividades para todas las edades.";

export default function PricingTable() {
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
