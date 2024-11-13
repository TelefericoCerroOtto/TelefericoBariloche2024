import type { InferType } from "yup";
import { loginSchema } from "@/lib/schemas/forms/auth";

export type LoginFormData = InferType<typeof loginSchema>;
