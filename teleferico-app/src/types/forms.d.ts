import { loginSchema } from "@/lib/schemas/forms/auth";
import {
  accessTicketSchema,
  activityTicketSchema,
} from "@/lib/schemas/forms/tickets";
import type { InferType } from "yup";

export type LoginFormData = InferType<typeof loginSchema>;
export type NewActivityTicketFormData = InferType<typeof activityTicketSchema>;
export type NewAccessTicketFormData = InferType<typeof accessTicketSchema>;
