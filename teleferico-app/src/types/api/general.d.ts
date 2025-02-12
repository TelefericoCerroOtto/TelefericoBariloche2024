export type StrapiLocales = "es-AR" | "en" | "pt";

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

export interface ImageFormat {
  ext: string;
  url: string;
  hash: string;
  mime: string;
  name: string;
  path: unkown;
  size: number;
  width: number;
  height: number;
  sizeInBytes: number;
}

export interface ImageFormats {
  large: Format;
  small: Format;
  medium: Format;
  thumbnail: Format;
}

export interface StrapiImage {
  id: number;
  documentId: string;
  name: string;
  alternativeText: string;
  caption: unkown;
  width: number;
  height: number;
  formats: Formats;
  hash: string;
  ext: string;
  mime: string;
  size: number;
  url: string;
  previewUrl: unkown;
  provider: string;
  provider_metadata: unkown;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  locale: unkown;
}
