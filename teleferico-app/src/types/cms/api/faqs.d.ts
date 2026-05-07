import type { Faq, Meta } from "@/types";

export type GetFaqResponse = {
  data: Faq;
  meta: Meta;
};

export type GetFaqsResponse = {
  data: Faq[];
  meta: Meta;
};

export type CreateFaqRequest = {
  data: Pick<Faq, "question" | "answer" | "featured">;
};

export type CreateFaqResponse = {
  data: Faq;
  meta: Meta;
};

export type UpdateFaqRequest = {
  data: Partial<Pick<Faq, "question" | "answer" | "featured">>;
};

export type UpdateFaqResponse = {
  data: Faq;
  meta: Meta;
};
