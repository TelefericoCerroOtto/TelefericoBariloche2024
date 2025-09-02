export type StrapiLocales = "es-AR" | "en" | "pt";

export type StrapiRecord<T> = T & {
  id: number;
  documentId: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  locale: T extends { locale: null } ? null : StrapiLocales;
};

export type FilteredStrapiRecord<T> = Pick<
  StrapiRecord<T>,
  "id" | "documentId"
> &
  T;

export interface StrapiError {
  status: number;
  name: string;
  message: string;
  details?: unknown;
}

export interface ErrorResponse {
  data: null;
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
  total: number;
}

export type Meta = {
  pagination: Pagination;
} & unknown;

export type DynamicZone<T> = Array<T>;

export interface ImageFormat {
  ext: string;
  url: string;
  hash: string;
  mime: string;
  name: string;
  path: unknown;
  size: number;
  width: number;
  height: number;
  sizeInBytes: number;
}

export interface ImageFormats {
  small: ImageFormat;
  medium?: ImageFormat;
  large?: ImageFormat;
  thumbnail: ImageFormat;
}

export type ExtendLocalizations<T extends { data: unknown; meta: Meta }> = {
  data: T["data"] extends unknown[]
    ? Array<T["data"][number] & { localizations: T["data"] }>
    : T["data"] & { localizations: T["data"][] };
};
