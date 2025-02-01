export type Locales = "en" | "es-AR" | "pt";

export interface StrapiError {
  status: number;
  name: string;
  message: string;
  details?: unknown;
}

export interface ErrorResponse {
  data?: null;
  error: StrapiError;
}

export type ServiceStateValues =
  | "normal"
  | "conditional"
  | "restricted"
  | "suspended"
  | "closed";

export interface Pagination {
  page: number;
  pageCount: number;
  pageSize: number;
  total: numebr;
}

export type Meta = {
  pagination: Pagination;
} & unknown;

export type DynamicZone<T> = Array<T>;
