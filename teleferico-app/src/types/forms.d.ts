import {
  accessTicketSchema,
  activityTicketSchema,
  BusTravelSchema,
  contactSchema,
  loginSchema,
  newUserSchema,
  postulationSchema,
  timeSchema,
  updateUserSchema,
  zoneScheduleSchema,
} from "@/lib/schemas/forms";
import type { InferType } from "yup";

export type LoginFormData = InferType<typeof loginSchema>;
export type NewActivityTicketFormData = InferType<typeof activityTicketSchema>;
export type NewAccessTicketFormData = InferType<typeof accessTicketSchema>;
export type ZoneScheduleFormData = InferType<typeof zoneScheduleSchema>;
export type BusTravelFormData = InferType<typeof BusTravelSchema>;
export type TimeFormData = InferType<typeof timeSchema>;
export type NewUserFormData = InferType<typeof newUserSchema>;
export type UpdateUserFormData = InferType<typeof updateUserSchema>;
export type PostulationFormData = InferType<typeof postulationSchema>;
export type ContactFormData = InferType<typeof contactSchema>;

export type FormSubmitServerActionResponse = Promise<{
  success: boolean;
  message: string;
  data?: unknown;
}>;
