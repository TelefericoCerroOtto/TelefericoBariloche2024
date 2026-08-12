// Este archivo contiene los posibles valores de los campos de tipo enum en las colecciones de Strapi.
// Sirve para tener una sola fuente de la verdad y evitar hardcodear strings en varios lados del código.

import type {
  Genders,
  LiftingMean,
  PostulationStatus,
  Season,
  ServiceStateValues,
  UserRoles,
} from "@/types";

export const POSTULATION_STATUSES: PostulationStatus[] = [
  "unreviewed",
  "hired",
  "discarded",
] as const;

export const GENDERS: Genders[] = ["male", "female", "other"] as const;

export const SEASONS: Season[] = [
  "summer",
  "autumn",
  "winter",
  "spring",
  "allSeasons",
] as const;

export const LIFTING_MEANS: LiftingMean[] = [
  "cablecar",
  "road&funicular",
] as const;

export const SERVICE_STATE_VALUES: ServiceStateValues[] = [
  "normal",
  "conditional",
  "restricted",
  "suspended",
  "closed",
] as const;

export const USER_ROLES: UserRoles[] = [
  "Public",
  "Authenticated",
  "Administrator",
  "Media Manager",
  "Recruiter",
  "Operations Supervisor",
] as const;
