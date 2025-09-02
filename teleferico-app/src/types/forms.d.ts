import {
  newActivitySchema,
  updateActivitySchema,
  BusTravelSchema,
  contactSchema,
  loginSchema,
  newAccessTicketSchema,
  newUserSchema,
  postulationSchema,
  timeSchema,
  updateAccessTicketSchema,
  updateUserSchema,
  updateZoneSchema,
} from "@/lib/schemas/forms";
import type { InferType } from "yup";

export type LoginFormData = InferType<typeof loginSchema>;
export type NewActivityFormData = InferType<typeof newActivitySchema>;
export type UpdateActivityFormData = InferType<typeof updateActivitySchema>;
export type NewAccessTicketFormData = InferType<typeof newAccessTicketSchema>;
export type UpdateAccessTicketFormData = InferType<
  typeof updateAccessTicketSchema
>;
export type ZoneFormData = InferType<typeof updateZoneSchema>;
export type BusTravelFormData = InferType<typeof BusTravelSchema>;
export type TimeFormData = InferType<typeof timeSchema>;
export type NewUserFormData = InferType<typeof newUserSchema>;
export type UpdateUserFormData = InferType<typeof updateUserSchema>;
export type PostulationFormData = InferType<typeof postulationSchema>;
export type ContactFormData = InferType<typeof contactSchema>;

export type TimeValue = InferType<typeof timeSchema>;
export type FormSubmitServerActionResponse = Promise<{
  success: boolean;
  message: string;
  data?: unknown;
}>;
