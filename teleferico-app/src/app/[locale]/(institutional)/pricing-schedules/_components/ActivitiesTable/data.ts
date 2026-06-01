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
  align?: "start" | "center" | "end";
}[];

export const columns: Record<Locales, Columns> = {
  "es-AR": [
    { key: "name", label: "Actividad", align: "start" },
    { key: "price", label: "Precio", align: "end" },
    {
      key: "minAge",
      label: "Edad mínima",
      align: "center",
    },
    { key: "season", label: "Temporada", align: "center" },
    { key: "status", label: "Estado", align: "center" },
    { key: "requirements", label: "Requisitos", align: "start" },
  ],
  en: [
    { key: "name", label: "Activity", align: "start" },
    { key: "price", label: "Price", align: "end" },
    { key: "minAge", label: "Minimum age", align: "center" },
    { key: "season", label: "Season", align: "center" },
    { key: "status", label: "Status", align: "center" },
    { key: "requirements", label: "Requirements", align: "start" },
  ],
  pt: [
    { key: "name", label: "Atividade", align: "start" },
    { key: "price", label: "Preço", align: "end" },
    {
      key: "minAge",
      label: "Idade mínima",
      align: "center",
    },
    { key: "season", label: "Temporada", align: "center" },
    { key: "status", label: "Estado", align: "center" },
    { key: "requirements", label: "Requisitos", align: "start" },
  ],
};

export const dictionaries = {
  "es-AR": {
    table: {
      ariaLabel: "Tabla de actividades y precios",
    },
    eyebrow: {
      activity: "Experiencia",
      price: "Tarifa",
    },
    price: {
      [0]: "Sin costo",
      [-1]: "Consultar precio",
      valueHint: "valor por persona",
      zeroHint: "actividad incluida",
      consultHint: "precio sujeto a consulta",
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
    table: {
      ariaLabel: "Activities and pricing table",
    },
    eyebrow: {
      activity: "Experience",
      price: "Rate",
    },
    price: {
      [0]: "No cost",
      [-1]: "Ask for price",
      valueHint: "price per person",
      zeroHint: "activity included",
      consultHint: "pricing available on request",
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
    table: {
      ariaLabel: "Tabela de atividades e preços",
    },
    eyebrow: {
      activity: "Experiência",
      price: "Tarifa",
    },
    price: {
      [0]: "Sem custo",
      [-1]: "Consultar preço",
      valueHint: "valor por pessoa",
      zeroHint: "atividade incluída",
      consultHint: "preço sob consulta",
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
