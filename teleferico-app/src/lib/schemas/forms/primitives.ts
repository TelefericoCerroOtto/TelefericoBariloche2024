import { isTiptapNonEmpty, isValidTiptapDoc } from "@/utils/tiptap";
import { type JSONContent } from "@tiptap/react";
import { mixed, number, object, string } from "yup";
import { MAX_IMAGE_FILE_SIZE_MB, VALID_IMAGE_FILE_TYPES } from "./constants";
import { localeMessages } from "./i18n";

const { "es-AR": es } = localeMessages;

export const timeSchema = object({
  hour: number()
    .integer(es.number.integer)
    .min(0, es.number.min(0))
    .max(23, es.number.max(0))
    .required(es.number.required),
  mins: number()
    .integer(es.number.integer)
    .min(0, es.number.min(0))
    .max(59, es.number.max(59))
    .required(es.number.required),
});

export const tiptapJsonSchema = mixed<JSONContent>()
  .transform((val) => {
    // Normalizamos a JSONContent o null antes de validar
    if (typeof val === "string") {
      const s = val.trim();
      if (s === "") return null;
      try {
        return JSON.parse(s) as JSONContent;
      } catch {
        return null;
      }
    }
    return (val ?? null) as JSONContent | null;
  })
  .test("tt-non-empty", "Este campo es obligatorio.", (val) => {
    // Desde acá, val ya es JSONContent | null por la transform
    if (!val || typeof val !== "object") return false;
    if (!isValidTiptapDoc(val)) return false;
    return isTiptapNonEmpty(val);
  })
  .test(
    "tt-json-parse",
    "El contenido del editor no es JSON válido.",
    (value) => {
      try {
        const doc = typeof value === "string" ? JSON.parse(value) : value;
        return !!doc && typeof doc === "object";
      } catch {
        return false;
      }
    },
  )
  .test(
    "tt-doc-shape",
    "El contenido del editor no tiene el formato de TipTap.",
    (value) => {
      const doc = typeof value === "string" ? JSON.parse(value) : value;
      return isValidTiptapDoc(doc);
    },
  );

export const imageStoredSchema = object({
  size: number().required(es.number.required),
  name: string().required(es.string.required),
  url: string().required(es.string.required),
  id: number().required(es.number.required),
  documentId: string().required(es.string.required),
});

export const imageUploadSchema = mixed<File>()
  .nullable()
  .test("file-type", "Formato no soportado (solo JPG, PNG o WebP)", (file) => {
    if (!file) return true;
    return VALID_IMAGE_FILE_TYPES.includes(file.type);
  })
  .test(
    "file-size",
    `El archivo no debe superar ${MAX_IMAGE_FILE_SIZE_MB}MB`,
    (file) => {
      if (!file) return true;
      return file.size <= MAX_IMAGE_FILE_SIZE_MB * 1024 * 1024;
    },
  );
