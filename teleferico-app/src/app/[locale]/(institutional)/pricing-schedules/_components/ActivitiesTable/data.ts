import type { Locales } from "@/types";

export type ColumnKeys =
  | "name"
  | "price"
  | "minAge"
  | "season"
  | "status"
  | "requirements";

export type Columns = {
  key: ColumnKeys;
  label: string;
}[];

export const columns: Record<Locales, Columns> = {
  "es-AR": [
    { key: "name", label: "Actividad" },
    { key: "price", label: "Precio por persona" },
    {
      key: "minAge",
      label: "Edad mínima",
    },
    { key: "season", label: "Temporada" },
    { key: "status", label: "Estado" },
    { key: "requirements", label: "Requisitos" },
  ],
  en: [
    { key: "name", label: "Activity" },
    { key: "price", label: "Price per person" },
    { key: "minAge", label: "Minimum age" },
    { key: "season", label: "Season" },
    { key: "status", label: "Status" },
    { key: "requirements", label: "Requirements" },
  ],
  pt: [
    { key: "name", label: "Atividade" },
    { key: "price", label: "Preço por pessoa" },
    {
      key: "minAge",
      label: "Idade mínima",
    },
    { key: "season", label: "Temporada" },
    { key: "status", label: "Estado" },
    { key: "requirements", label: "Requisitos" },
  ],
};

export const dictionaries = {
  "es-AR": {
    price: {
      prefix: "$",
      [0]: "Sin costo",
      [-1]: "Consultar precio",
    },
    minAge: {
      unit: "años",
      [0]: "Sin restricción",
    },
    maxAge: {
      unit: "años",
      [0]: "Sin límite",
    },
    requirements: {
      none: "No hay",
    },
    availability: {
      available: "Disponible",
      unavailable: "No disponible",
    },
  },
  en: {
    price: {
      prefix: "$",
      [0]: "No cost",
      [-1]: "Ask for price",
    },
    minAge: {
      unit: "years",
      [0]: "No restriction",
    },
    maxAge: {
      unit: "years",
      [0]: "No limit",
    },
    requirements: {
      none: "None",
    },
    availability: {
      available: "Available",
      unavailable: "Unavailable",
    },
  },
  pt: {
    price: {
      prefix: "$",
      [0]: "Sem custo",
      [-1]: "Consultar preço",
    },
    minAge: {
      unit: "anos",
      [0]: "Sem restrição",
    },
    maxAge: {
      unit: "anos",
      [0]: "Sem limite",
    },
    requirements: {
      none: "Nenhuma",
    },
    availability: {
      available: "Disponível",
      unavailable: "Indisponível",
    },
  },
} as const;
