import type {
  Genders,
  LiftingMean,
  Locales,
  PostulationStatus,
  Season,
  UserRoles,
} from "@/types";

type LocalizedOptions<O extends string> = {
  // eslint-disable-next-line no-unused-vars
  [Locale in Locales]: {
    // eslint-disable-next-line no-unused-vars
    [Option in O]: string;
  };
};

export const POSTULATION_STATUSES_TRANSLATIONS: LocalizedOptions<PostulationStatus> =
  {
    "es-AR": {
      discarded: "Descartado",
      hired: "Contratado",
      unreviewed: "Sin revisar",
    },
    en: {
      discarded: "Discarded",
      hired: "Hired",
      unreviewed: "Unreviewed",
    },
    pt: {
      discarded: "Descartado",
      hired: "Contratado",
      unreviewed: "Não Revisado",
    },
  };

export const GENDERS_TRANSLATIONS: LocalizedOptions<Genders> = {
  "es-AR": {
    female: "Femenino",
    male: "Masculino",
    other: "Otro",
  },
  en: {
    female: "Female",
    male: "Male",
    other: "Other",
  },
  pt: {
    female: "Feminino",
    male: "Masculino",
    other: "Outro",
  },
};

export const SEASONS_TRANSLATIONS: LocalizedOptions<Season> = {
  "es-AR": {
    autumn: "Otoño",
    allSeasons: "Todas las estaciones",
    spring: "Primavera",
    summer: "Verano",
    winter: "Invierno",
  },
  en: {
    autumn: "Autumn",
    allSeasons: "All Seasons",
    spring: "Spring",
    summer: "Summer",
    winter: "Winter",
  },
  pt: {
    autumn: "Outono",
    allSeasons: "Todas as estações",
    spring: "Primavera",
    summer: "Verão",
    winter: "Inverno",
  },
};

export const LIFTING_MEANS_TRANSLATIONS: LocalizedOptions<LiftingMean> = {
  "es-AR": {
    cablecar: "Teleférico",
    "road&funicular": "Camino y Funicular",
  },
  en: {
    cablecar: "Cablecar",
    "road&funicular": "Road & Funicular",
  },
  pt: {
    cablecar: "Teleférico",
    "road&funicular": "Estrada e Funicular",
  },
};

export const USER_ROLES_TRANSLATIONS: LocalizedOptions<UserRoles> = {
  "es-AR": {
    Administrator: "Administrador",
    Authenticated: "Autenticado",
    "Media Manager": "Gestor de Medios",
    Public: "Público",
    Recruiter: "Reclutador",
    "Operations Supervisor": "Supervisor de Operaciones",
  },
  en: {
    Administrator: "Administrator",
    Authenticated: "Authenticated",
    "Media Manager": "Media Manager",
    Public: "Public",
    Recruiter: "Recruiter",
    "Operations Supervisor": "Operations Supervisor",
  },
  pt: {
    Administrator: "Administrador",
    Authenticated: "Autenticado",
    "Media Manager": "Gerente de Mídia",
    Public: "Público",
    Recruiter: "Recrutador",
    "Operations Supervisor": "Supervisor de Operações",
  },
};
