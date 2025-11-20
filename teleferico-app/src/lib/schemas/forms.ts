import {
  validateEmailAvailability,
  validateUsernameAvailability,
} from "@/lib/actions/forms";
import type { Locales, LoginUserRequest } from "@/types";
import { isTiptapNonEmpty, isValidTiptapDoc } from "@/utils/tiptap";
import { type JSONContent } from "@tiptap/react";
import { boolean, mixed, number, object, ObjectSchema, string } from "yup";

type LocaleMessage = {
  mixed: {
    required: string;
  };
  string: {
    required: string;
    // eslint-disable-next-line no-unused-vars
    min: (min: number) => string;
    // eslint-disable-next-line no-unused-vars
    max: (max: number) => string;
    email: string;
  };
  number: {
    required: string;
    integer: string;
    // eslint-disable-next-line no-unused-vars
    min: (min: number) => string;
    // eslint-disable-next-line no-unused-vars
    max: (max: number) => string;
  };
};

const localeMessages: Record<Locales, LocaleMessage> = {
  "es-AR": {
    mixed: {
      required: "Este campo es obligatorio",
    },
    string: {
      required: "Este campo es obligatorio",
      min: (min: number) => `Debe tener al menos ${min} caracteres`,
      max: (max: number) => `Debe tener máximo ${max} caracteres`,
      email: "El correo electrónico no es válido",
    },
    number: {
      required: "Este campo es obligatorio",
      integer: "Debe ser un numero entero",
      min: (min: number) => `El valor mínimo permitido es ${min}`,
      max: (max: number) => `El valor máximo permitido es ${max}`,
    },
  },
  en: {
    mixed: {
      required: "This field is required",
    },
    string: {
      required: "This field is required",
      min: (min: number) => `Must be at least ${min} characters`,
      max: (max: number) => `Must be at most ${max} characters`,
      email: "The email address is not valid",
    },
    number: {
      required: "This field is required",
      integer: "Must be an integer",
      min: (min: number) => `The minimum allowed value is ${min}`,
      max: (max: number) => `The maximum allowed value is ${max}`,
    },
  },
  pt: {
    mixed: {
      required: "Este campo é obrigatório",
    },
    string: {
      required: "Este campo é obrigatório",
      min: (min: number) => `Deve ter pelo menos ${min} caracteres`,
      max: (max: number) => `Deve ter no máximo ${max} caracteres`,
      email: "O e-mail não é válido",
    },
    number: {
      required: "Este campo é obrigatório",
      integer: "Deve ser um número inteiro",
      min: (min: number) => `O valor mínimo permitido é ${min}`,
      max: (max: number) => `O valor máximo permitido é ${max}`,
    },
  },
};

const VALID_IMAGE_FILE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_FILE_SIZE_MB = 5;

const FILE_TYPES = [
  "application/pdf", // PDF
  "application/msword", // DOC (Word 97-2003)
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // DOCX (Word moderno)
  "text/plain", // TXT
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 1MB

// TODO: Crear el tipo de las requests
// export const mySchema: Yup.ObjectSchema<myRequestType> = object({ ... })

const { en, pt, "es-AR": es } = localeMessages;

export const loginSchema: ObjectSchema<LoginUserRequest> = object({
  identifier: string().email(es.string.email).required(es.string.required),
  password: string().required(es.string.required),
});

export const createActivitySchema = object({
  "activityName_es-AR": string().required(es.string.required),
  activityName_en: string().required(es.string.required),
  activityName_pt: string().required(es.string.required),
  "description_es-AR": string().max(500, es.string.max(500)),
  description_en: string().max(500, es.string.max(500)),
  description_pt: string().max(500, es.string.max(500)),
  price: number().integer(es.number.integer).required(es.number.required),
  minAge: number().integer(es.number.integer).required(es.number.required),
  season: string()
    .oneOf(["summer", "autumn", "winter", "spring", "allSeasons"])
    .required(es.string.required),
  "requirements_es-AR": string(),
  requirements_en: string(),
  requirements_pt: string(),
});

export const updateActivitySchema = createActivitySchema.shape({
  activityDocumentId: string().required(es.string.required),
  activityTranslationDocumentId: string(),
});

export const createAccessTicketSchema = object({
  accessName_en: string().required(es.string.required).min(2, es.string.min(2)),
  "accessName_es-AR": string()
    .required(es.string.required)
    .min(2, es.string.min(2)),
  accessName_pt: string().required(es.string.required).min(2, es.string.min(2)),
  price: number()
    .integer(es.number.integer)
    .required(es.number.required)
    .min(0, es.number.min(0)),
  liftingMean: string()
    .oneOf(["cablecar", "road&funicular"])
    .required(es.string.required),
});

export const updateAccessTicketSchema = createAccessTicketSchema.shape({
  documentId: string().required(es.string.required),
});

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

export const updateZoneSchema = object({
  "zoneName_es-AR": string()
    .required(es.string.required)
    .min(2, es.string.min(2)),
  zoneName_en: string().required(es.string.required).min(2, en.string.min(2)),
  zoneName_pt: string().required(es.string.required).min(2, pt.string.min(2)),
  "zoneDescription_es-AR": string().max(500, es.string.max(500)),
  zoneDescription_en: string().max(500, en.string.max(500)),
  zoneDescription_pt: string().max(500, pt.string.max(500)),
  openTime: timeSchema,
  closeTime: timeSchema,
  isOpen: boolean().required(es.string.required),
  documentId: string().required(es.string.required),
  zoneTrasnlationDocumentId: string().required(es.string.required),
});

export const createBusTripSchema = object({
  origin: string().required(es.string.required),
  destination: string().required(es.string.required),
  depTime: timeSchema,
  arrTime: timeSchema,
});

export const updateBusTripSchema = createBusTripSchema.shape({
  documentId: string().required(es.string.required),
});

export const newUserSchema = object({
  // id value is deleted within the adapter
  id: number(),
  username: string()
    .required(es.string.required)
    .min(2, es.string.min(2))
    .test(
      "unique-username",
      "Usuario ya registrado",
      validateUsernameAvailability,
    ),
  name: string().required(es.string.required).min(2, es.string.min(2)),
  surname: string().required(es.string.required).min(2, es.string.min(2)),
  email: string()
    .email(es.string.email)
    .required(es.string.required)
    .test("unique-email", "Email ya registrado", validateEmailAvailability),
  password: string().required("Campo requerido"),
  role: string()
    .matches(/^\d+$/, "Debe ser un id con caracteres numericos")
    .required(es.string.required),
});

export const updateUserSchema = object({
  id: number().integer(es.number.integer).required(es.number.required),
  username: string().required(es.string.required).min(2, es.string.min(2)),
  name: string().required(es.string.required).min(2, es.string.min(2)),
  surname: string().required(es.string.required).min(2, es.string.min(2)),
  email: string().email(es.string.email).required(es.string.required),
  password: string(),
  role: string()
    .matches(/^\d+$/, "Debe ser un id con caracteres numericos")
    .required(es.string.required),
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

const imageStoredSchema = object({
  size: number().required(es.number.required),
  name: string().required(es.string.required),
  url: string().required(es.string.required),
  id: number().required(es.number.required),
  documentId: string().required(es.string.required),
});

const imageUploadSchema = mixed<File>()
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

export const createNewSchema = object({
  "title_es-AR": string().required(es.string.required).min(3, es.string.min(3)),
  title_en: string().required(es.string.required).min(3, es.string.min(3)),
  title_pt: string().required(es.string.required).min(3, es.string.min(3)),
  "body_es-AR": tiptapJsonSchema.required(es.string.required),
  body_en: tiptapJsonSchema.required(es.string.required),
  body_pt: tiptapJsonSchema.required(es.string.required),
  "brief_es-AR": tiptapJsonSchema.required(es.string.required),
  brief_en: tiptapJsonSchema.required(es.string.required),
  brief_pt: tiptapJsonSchema.required(es.string.required),
  newCoverImageFile: imageUploadSchema.required(es.mixed.required).nullable(),
  date: string()
    .required(es.string.required)
    .test("valid-date", "La fecha no es válida", (value) => {
      if (!value) return false;
      return !Number.isNaN(Date.parse(value));
    }),
  highlighted: boolean().default(false),
});

export const updateNewSchema = createNewSchema.shape({
  newCoverImageFile: imageUploadSchema,
  coverImage: imageStoredSchema,
  documentId: string().required(es.string.required),
});

export const createFaqSchema = object({
  "question_es-AR": string()
    .required(es.string.required)
    .min(8, es.string.min(8))
    .max(100, es.string.max(100)),
  question_en: string()
    .required(es.string.required)
    .min(8, es.string.min(8))
    .max(100, es.string.max(100)),
  question_pt: string()
    .required(es.string.required)
    .min(8, es.string.min(8))
    .max(100, es.string.max(100)),
  "answer_es-AR": string()
    .required(es.string.required)
    .min(10, es.string.min(10))
    .max(250, es.string.max(250)),
  answer_en: string()
    .required(es.string.required)
    .min(10, es.string.min(10))
    .max(250, es.string.max(250)),
  answer_pt: string()
    .required(es.string.required)
    .min(10, es.string.min(10))
    .max(250, es.string.max(250)),
  featured: boolean().required(es.string.required),
});

export const updateFaqSchema = createFaqSchema.shape({
  documentId: string().required(es.string.required),
});

// MIME types de los formatos de archivo
// Si solo validáramos por extensión, alguien podría subir un archivo malicioso renombrado como
// cv.docx.exe. Por eso, validar por MIME type es más seguro.

export const buildPostulationSchema = (locale: Locales) => {
  const m = localeMessages[locale];

  return object({
    name: string()
      .required(m.string.required)
      .min(2, m.string.min(2))
      .max(30, m.string.max(30)),
    surname: string()
      .required(m.string.required)
      .min(2, m.string.min(2))
      .max(30, m.string.max(30)),
    genre: string()
      .required(m.string.required)
      .oneOf(["male", "female", "other"]),
    age: number()
      .integer(m.number.integer)
      .required(m.number.required)
      .min(18, m.number.min(18))
      .max(80, m.number.max(80)),
    email: string().email(m.string.email).required(m.string.required),
    sector: string().required(m.string.required),
    note: string().max(400, m.string.max(400)),
    campNo: number().integer(m.number.integer),
    resume: mixed<File>()
      .required(m.mixed.required)
      .test(
        "fileType",
        "Solo se permiten archivos PDF, DOC, DOCX o TXT",
        (file) => {
          return file && FILE_TYPES.includes(file.type);
        },
      )
      .test("fileSize", "El archivo no debe superar los 5MB", (file) => {
        return file && file.size <= MAX_FILE_SIZE;
      }),
  });
};

export const buildContactSchema = (locale: Locales) => {
  const m = localeMessages[locale];

  return object({
    name: string().required(m.string.required).min(2, m.string.min(2)),
    email: string().required(m.string.required).email(m.string.email),
    consultation: string()
      .required(m.string.required)
      .max(150, m.string.max(150)),
  });
};
