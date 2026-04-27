import type { Meta, Ticket } from "@/types";

export type GetTicketResponse = {
  data: Ticket;
  meta: Meta;
};

export type GetTicketsResponse = {
  data: Ticket[];
  meta: Meta;
};

export type PostAccessTicketRequest = {
  data: Pick<Ticket, "name" | "description" | "price" | "lifting_mean"> &
    Partial<Pick<Ticket, "sortOrder">>;
};

export type PostAccessTicketResponse = {
  data: Ticket;
  meta: Meta;
};

export type UpdateAccessTicketRequest = {
  data: Partial<
    Pick<Ticket, "name" | "description" | "price" | "lifting_mean" | "sortOrder">
  >;
};

export type UpdateAccessTicketResponse = {
  data: Ticket;
  meta: Meta;
};
