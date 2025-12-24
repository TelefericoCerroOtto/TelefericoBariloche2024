import type { Meta, New } from "@/types";

export type GetNewResponse = {
  data: New;
  meta: Meta;
};

export type GetNewsResponse = {
  data: Omit<New, "createdAt" | "publishedAt" | "body" | "locale">[];
  meta: Meta;
};

export type CreateNewRequest = {
  data: Pick<New, "title" | "body" | "brief" | "date" | "highlighted"> & {
    cover: number;
  };
};

export type CreateNewResponse = {
  data: New;
  meta: Meta;
};

export type UpdateNewRequest = {
  data: Partial<
    Pick<New, "title" | "body" | "brief" | "date" | "highlighted"> & {
      cover: number;
    }
  >;
};

export type UpdateNewResponse = {
  data: New;
  meta: Meta;
};
