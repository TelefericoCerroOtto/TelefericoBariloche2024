import {
  contactSchema,
  createAccessTicketSchema,
  createActivitySchema,
  createBusTripSchema,
  loginSchema,
  newUserSchema,
  postulationSchema,
  timeSchema,
  newsFormSchema,
  updateAccessTicketSchema,
  updateActivitySchema,
  updateBusTripSchema,
  updateUserSchema,
  updateZoneSchema,
} from "@/lib/schemas";
import type { InferType } from "yup";

export type LoginFormData = InferType<typeof loginSchema>;
export type CreateActivityFormData = InferType<typeof createActivitySchema>;
export type UpdateActivityFormData = InferType<typeof updateActivitySchema>;
export type CreateAccessTicketFormData = InferType<
  typeof createAccessTicketSchema
>;
export type UpdateAccessTicketFormData = InferType<
  typeof updateAccessTicketSchema
>;
export type ZoneFormData = InferType<typeof updateZoneSchema>;
export type CreateBusTripFormData = InferType<typeof createBusTripSchema>;
export type UpdateBusTripFormData = InferType<typeof updateBusTripSchema>;
export type TimeFormData = InferType<typeof timeSchema>;
export type NewUserFormData = InferType<typeof newUserSchema>;
export type UpdateUserFormData = InferType<typeof updateUserSchema>;
export type PostulationFormData = InferType<typeof postulationSchema>;
export type ContactFormData = InferType<typeof contactSchema>;
export type NewsFormData = InferType<typeof newsFormSchema>;

export type TimeValue = InferType<typeof timeSchema>;
export type FormSubmitServerActionResponse = Promise<{
  success: boolean;
  message: string;
  data?: unknown;
}>;
