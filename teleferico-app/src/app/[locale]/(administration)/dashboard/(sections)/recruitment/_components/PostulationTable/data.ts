export type ColumnKeys =
  | "date"
  | "name"
  | "email"
  | "age"
  | "gender"
  | "sector"
  | "postulation_status"
  | "campNo"
  | "note"
  | "actions";

export const PAGE_SIZE = 10;

export const columns: { key: ColumnKeys; label: string }[] = [
  { key: "date", label: "Fecha" },
  { key: "name", label: "Nombre completo" },
  { key: "email", label: "email" },
  { key: "age", label: "Edad" },
  { key: "gender", label: "Género" },
  { key: "postulation_status", label: "Estado del postulante" },
  { key: "sector", label: "Sector" },
  { key: "note", label: "Nota" },
  { key: "campNo", label: "Código de campaña" },
  { key: "actions", label: "Acciones" },
];
