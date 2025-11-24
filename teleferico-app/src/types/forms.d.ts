import {
  buildContactSchema,
  buildPostulationSchema,
  createAccessTicketSchema,
  createActivitySchema,
  createBusTripSchema,
  createFaqSchema,
  createNewSchema,
  loginSchema,
  newUserSchema,
  timeSchema,
  updateAccessTicketSchema,
  updateActivitySchema,
  updateBusTripSchema,
  updateFaqSchema,
  updateNewSchema,
  updateUserSchema,
  updateZoneSchema,
} from "@/lib/schemas";
import type { InferType } from "yup";
import type { Locales } from "./i18n";

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
export type PostulationFormData = InferType<
  ReturnType<typeof buildPostulationSchema>
>;
export type ContactFormData = InferType<ReturnType<typeof buildContactSchema>>;
export type CreateNewFormData = InferType<typeof createNewSchema>;
export type UpdateNewFormData = InferType<typeof updateNewSchema>;
export type CreateFaqFormData = InferType<typeof createFaqSchema>;
export type UpdateFaqFormData = InferType<typeof updateFaqSchema>;

export type TimeValue = InferType<typeof timeSchema>;
export type FormSubmitServerActionResponse = Promise<{
  success: boolean;
  message: string;
  data?: unknown;
}>;
export type InputLocaleConfig = Record<
  Locales,
  { label: string; placeholder: string; name: string }
>;
