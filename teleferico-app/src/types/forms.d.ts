import {
  loginSchema,
  accessTicketSchema,
  activityTicketSchema,
  zoneScheduleSchema,
} from "@/lib/schemas/forms";
import type { InferType } from "yup";

export type LoginFormData = InferType<typeof loginSchema>;
export type NewActivityTicketFormData = InferType<typeof activityTicketSchema>;
export type NewAccessTicketFormData = InferType<typeof accessTicketSchema>;
export type ZoneScheduleFormData = InferType<typeof zoneScheduleSchema>;
