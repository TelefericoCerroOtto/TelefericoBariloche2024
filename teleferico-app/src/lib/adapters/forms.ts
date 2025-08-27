import type {
  ExtendLocalizations,
  GetTicketResponse,
  GetZoneResponse,
  Locales,
  NewUserFormData,
  NewUserRequest,
  PostPostulationRequest,
  PostulationFormData,
  UpdateAccessTicketFormData,
  UpdateUserFormData,
  UpdateUserRequest,
  UpdateZoneRequest,
  UpdateZoneTranslationRequest,
  ZoneFormData,
} from "@/types";
import { cleanObject } from "@/utils/clean-object";
import { TimeValueToStrapiTime } from "./formats";

// TODO: Agregar el infijo Form a los nombres de los adapters

export const newUserAdapter = (user: NewUserFormData): NewUserRequest => {
  // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
  const { role, id: _, ...data } = user;
  const adaptedUser = { ...data, role: { connect: [{ id: parseInt(role) }] } };
  return adaptedUser;
};

export const updateUserAdapter = (
  user: UpdateUserFormData,
): UpdateUserRequest => {
  // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
  const { id: _, ...data } = user;
  const cleanedData = cleanObject(data);
  const adaptedUser = {
    ...cleanedData,
  };
  console.log("adaptedUser", adaptedUser);
  return adaptedUser;
};

export const postPostulationAdapter = (
  postulation: PostulationFormData,
): PostPostulationRequest => {
  // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
  const { sector, resume: _, ...props } = postulation;

  const adaptedPostulation: PostPostulationRequest = {
    data: {
      ...props,
      sector: { connect: [{ documentId: sector }] },
    },
  };

  return adaptedPostulation;
};

export const getAccessTicketAdapter = (
  ticket: ExtendLocalizations<GetTicketResponse>,
): UpdateAccessTicketFormData => {
  const {
    name: defaultName,
    price,
    lifting_mean,
    localizations,
    locale: defaultLocale,
    documentId,
  } = ticket.data;

  const formData: UpdateAccessTicketFormData = {
    accessName_en: "",
    "accessName_es-AR": "",
    accessName_pt: "",
    price,
    documentId,
    liftingMean: lifting_mean,
  };

  const mapLocales = {
    "es-AR": "accessName_es-AR",
    en: "accessName_en",
    pt: "accessName_pt",
  } as const;

  formData[mapLocales[defaultLocale]] = defaultName;

  localizations.map((localization) => {
    const { locale, name } = localization;
    formData[mapLocales[locale]] = name;
  });

  return formData;
};

export const getZoneAdapter = (zone: GetZoneResponse): ZoneFormData => {
  const { openTime, closeTime, documentId, zone_translations } = zone.data;
  const { documentId: zoneTrasnlationDocumentId } = zone_translations[0];
  const [openHour, openMins] = openTime.split(":").map(Number);
  const [closeHour, closeMins] = closeTime.split(":").map(Number);

  const formData: ZoneFormData = {
    "zoneName_es-AR": "",
    zoneName_en: "",
    zoneName_pt: "",
    openTime: {
      hour: openHour,
      mins: openMins,
    },
    closeTime: {
      hour: closeHour,
      mins: closeMins,
    },
    documentId,
    zoneTrasnlationDocumentId,
  };

  const mapLocales = {
    "es-AR": "zoneName_es-AR",
    en: "zoneName_en",
    pt: "zoneName_pt",
  } as const;

  zone_translations.map((zdesc) => {
    const { locale, name } = zdesc;
    formData[mapLocales[locale]] = name;
  });

  return formData;
};

export const updateZoneAdapter = (zone: ZoneFormData): UpdateZoneRequest => {
  const reqBody: UpdateZoneRequest = { data: { openTime: "", closeTime: "" } };

  reqBody.data.openTime = TimeValueToStrapiTime(zone.openTime);
  reqBody.data.closeTime = TimeValueToStrapiTime(zone.closeTime);

  return reqBody;
};

export const updateZoneTranslationAdapter = (
  zone: ZoneFormData,
  locale: Locales,
): UpdateZoneTranslationRequest => {
  const reqBody: UpdateZoneTranslationRequest = {
    data: { name: "", description: "" },
  };

  reqBody.data.name = zone[`zoneName_${locale}`];

  return reqBody;
};
