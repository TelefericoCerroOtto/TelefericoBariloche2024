import { Locales } from "@/types";

type LocaleMessage = {
  mixed: {
    required: string;
    resumeType: string;
    // eslint-disable-next-line no-unused-vars
    fileSize: (s: number) => string;
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

export const localeMessages: Record<Locales, LocaleMessage> = {
  "es-AR": {
    mixed: {
      required: "Este campo es obligatorio",
      resumeType: "Solo se permiten archivos PDF, DOC, DOCX o TXT",
      fileSize: (s: number) => `El archivo no debe superar ${s}MB`,
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
      resumeType: "Only PDF, DOC, DOCX or TXT files are allowed",
      fileSize: (s: number) => `The file must not exceed ${s}MB`,
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
      resumeType: "Apenas arquivos PDF, DOC, DOCX ou TXT são permitidos",
      fileSize: (s: number) => `O arquivo não deve exceder ${s}MB`,
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
