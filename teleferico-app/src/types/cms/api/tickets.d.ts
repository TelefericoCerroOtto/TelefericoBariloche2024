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
  data: {
    name: string;
    price: number;
    lifting_mean: "cablecar" | "road&funicular";
  };
};

export type PostAccessTicketResponse = {
  data: Ticket;
  meta: Meta;
};

export type UpdateAccessTicketRequest = {
  data: {
    name?: string;
    price?: number;
    lifting_mean?: "cablecar" | "road&funicular";
  };
};

export type UpdateAccessTicketResponse = {
  data: Ticket;
  meta: Meta;
};
