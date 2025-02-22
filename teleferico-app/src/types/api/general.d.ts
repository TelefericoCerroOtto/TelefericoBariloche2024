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
  small: ImageFormat;
  medium?: ImageFormat;
  large?: ImageFormat;
  thumbnail: ImageFormat;
}

export type StrapiImage = StrapiRecord<{
  name: string;
  alternativeText: string;
  caption: unkown;
  width: number;
  height: number;
  formats: ImageFormats;
  hash: string;
  ext: string;
  mime: string;
  size: number;
  url: string;
  previewUrl: unkown;
  provider: string;
  provider_metadata: unkown;
}>;
