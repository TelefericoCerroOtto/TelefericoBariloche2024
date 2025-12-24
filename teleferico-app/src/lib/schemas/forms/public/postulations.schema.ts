// MIME types de los formatos de archivo
// Si solo validáramos por extensión, alguien podría subir un archivo malicioso renombrado como
// cv.docx.exe. Por eso, validar por MIME type es más seguro.

import { GENDERS } from "@/lib/constants/enum-fields.const";
import type { Genders, Locales } from "@/types";
import { mixed, number, object, string } from "yup";
import { FILE_TYPES, MAX_FILE_SIZE } from "../constants";
import { localeMessages } from "../i18n";

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
    gender: string<Genders>().required(m.string.required).oneOf(GENDERS),
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
      .test("fileType", m.mixed.resumeType, (file) => {
        console.log("file type: ", file.type);
        return file && FILE_TYPES.includes(file.type);
      })
      .test("fileSize", m.mixed.fileSize(MAX_FILE_SIZE), (file) => {
        return file && file.size <= MAX_FILE_SIZE;
      }),
  });
};
