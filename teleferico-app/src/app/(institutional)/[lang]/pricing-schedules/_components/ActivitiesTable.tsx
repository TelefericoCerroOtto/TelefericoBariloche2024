"use client";

import { type Key } from "react";
import DataTable from "./DataTable";
import { ROUTES } from "@/utils/routes.const";

interface Activity {
  id: number;
  activity: string;
  zone: string;
  price: number;
  minAge: number;
  season: "summer" | "autumn" | "winter" | "spring" | "all";
  requirements: string;
}

const columns: Array<{ key: keyof Activity; label: string }> = [
  { key: "activity", label: "Actividad" },
  { key: "zone", label: "Zona" },
  { key: "price", label: "Precio por persona" },
  { key: "minAge", label: "Edad minima" },
  { key: "season", label: "Temporada" },
  { key: "requirements", label: "Requisitos" },
];

const items: Activity[] = [
  {
    id: 1,
    activity: "Tirolesa",
    zone: "Teleférico",
    price: 15000,
    minAge: 5,
    season: "all",
    requirements: "",
  },
  {
    id: 2,
    activity: "Muro de Escalada (Palestra)",
    zone: "Teleférico",
    price: 10000,
    minAge: 5,
    season: "all",
    requirements: "Condiciones de salud adecuadas",
  },
  {
    id: 3,
    activity: "Combo Tirolesa + Palestra",
    zone: "Teleférico",
    price: 20000,
    minAge: 5,
    season: "all",
    requirements: "Condiciones de salud adecuadas",
  },
  {
    id: 4,
    activity: "Caminata con Raquetas",
    zone: "Teleférico",
    price: 15000,
    minAge: 0,
    season: "winter",
    requirements: "Talla mínima de calzado 35/36, uso de guantes",
  },
  {
    id: 5,
    activity: "Pista de Trineos (Adultos)",
    zone: "Teleférico",
    price: 15000,
    minAge: 12,
    season: "winter",
    requirements: "Uso de guantes obligatorio",
  },
  {
    id: 6,
    activity: "Pista de Trineos (Niños)",
    zone: "Camino y funicular",
    price: 20000,
    minAge: 3,
    season: "winter",
    requirements: "Uso de guantes, altura adecuada",
  },
  {
    id: 7,
    activity: "Circuito Otto",
    zone: "Camino y funicular",
    price: 20000,
    minAge: 0,
    season: "summer",
    requirements: "",
  },
];

export const renderCell = (price: Activity, columnKey: Key) => {
  const cellValue = price[columnKey as keyof Activity];

  switch (columnKey) {
    case "activity":
      return <span>{cellValue as string}</span>;
    case "zone":
      return <span>{cellValue as string}</span>;
    case "price":
      if (cellValue === 0) return <span>Sin cargo</span>;
      return <span>${cellValue as string}</span>;
    case "minAge":
      if (cellValue === 0) return <span>No hay</span>;
      return <span>{cellValue as string} años</span>;
    case "season":
      if (cellValue === "all") return <span>Todo el año</span>;
      return <span>{cellValue as string}</span>;
    case "requirements":
      if (cellValue === "") return <span>No hay</span>;
      return <span>{cellValue as string}</span>;

    default:
      return <span>{cellValue as string}</span>;
  }
};

const TITLE = "Actividades de Invierno, Verano y Todo El Año";
const DESC =
  "No importa si venís en pleno invierno con la nieve haciendo magia en el paisaje o en verano con días soleados y vistas increíbles, siempre hay algo para disfrutar. ";

export default function ActivitiesTable() {
  return (
    <DataTable
      title={TITLE}
      desc={DESC}
      renderCell={renderCell}
      items={items}
      columns={columns}
      link={{ href: ROUTES.ACTIVITIES, label: "Ver las actividades" }}
    />
  );
}
