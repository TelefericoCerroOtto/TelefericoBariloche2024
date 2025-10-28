export type StrapiLocales = "es-AR" | "en" | "pt";

export type StrapiRecord<T> = T & {
  id: number;
  documentId: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  locale: T extends { locale: null } ? null : StrapiLocales;
};

// Un nodo de texto inline válido para Strapi
export type StrapiTextNode = {
  type: "text";
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
};

// Un link inline válido
export type StrapiLinkNode = {
  type: "link";
  url: string;
  openInNewTab?: boolean;
  children: StrapiTextNode[]; // adentro del link solo hay texto marcado
};

// Inline permitido dentro de un párrafo / heading
export type StrapiInlineNode = StrapiTextNode | StrapiLinkNode;

// Párrafo de Strapi
export type StrapiParagraphNode = {
  type: "paragraph";
  children: StrapiInlineNode[];
};

// Heading de Strapi
export type StrapiHeadingNode = {
  type: "heading";
  level: 1 | 2 | 3 | 4 | 5 | 6;
  children: StrapiInlineNode[];
};

// Item de lista
export type StrapiListItemNode = {
  type: "list-item";
  children: StrapiInlineNode[]; // nodos inline directamente
};

// Lista ordenada / desordenada
export type StrapiListNode = {
  type: "list";
  format: "ordered" | "unordered";
  start?: number; // solo en ordered con start distinto de 1
  children: StrapiListItemNode[];
};

// "Block node" genérico de nivel raíz en el campo Blocks
export type StrapiBlockNode =
  | StrapiParagraphNode
  | StrapiHeadingNode
  | StrapiListNode
  | StrapiListItemNode; // (según cómo Strapi serializa list-item en root, en tu caso puede que solo aparezca dentro de list)

// Y el contenido completo del campo `body`
export type StrapiBlocksPayload = StrapiBlockNode[];

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

export type StrapiImage = StrapiRecord<{
  name: string;
  alternativeText: string;
  caption: unknown;
  width: number;
  height: number;
  formats: ImageFormats;
  hash: string;
  ext: string;
  mime: string;
  size: number;
  url: string;
  previewUrl: unknown;
  provider: string;
  provider_metadata: unknown;
}>;

export type StrapiPDF = StrapiRecord<{
  name: string;
  alternativeText: null;
  caption: null;
  width: null;
  height: null;
  formats: null;
  hash: string;
  ext: string;
  mime: string;
  size: number;
  url: string;
  previewUrl: null;
  provider: string;
  provider_metadata: null;
}>;

export type ExtendLocalizations<T extends { data: unknown; meta: Meta }> = {
  data: T["data"] extends unknown[]
    ? Array<T["data"][number] & { localizations: T["data"] }>
    : T["data"] & { localizations: T["data"][] };
};
