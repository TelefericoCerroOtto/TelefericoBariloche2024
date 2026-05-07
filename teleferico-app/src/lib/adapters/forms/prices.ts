import type {
  CreateAccessTicketFormData,
  CreateActivityFormData,
  ExtendLocalizations,
  GetActivityResponse,
  GetTicketResponse,
  Locales,
  PostAccessTicketRequest,
  PostActivityRequest,
  PostActivityTranslationRequest,
  UpdateAccessTicketFormData,
  UpdateAccessTicketRequest,
  UpdateActivityFormData,
  UpdateActivityRequest,
  UpdateActivityTranslationRequest,
} from "@/types";

const getAccessNameKey = (locale: Locales) => `accessName_${locale}` as const;
const getAccessDescriptionKey = (locale: Locales) =>
  `accessDescription_${locale}` as const;
const getActivityNameKey = (locale: Locales) =>
  `activityName_${locale}` as const;
const getActivityDescriptionKey = (locale: Locales) =>
  `description_${locale}` as const;
const getActivityRequirementsKey = (locale: Locales) =>
  `requirements_${locale}` as const;

export const getAccessTicketAdapter = (
  ticket: ExtendLocalizations<GetTicketResponse>,
): UpdateAccessTicketFormData => {
  const {
    name: defaultName,
    description: defaultDescription,
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
    accessDescription_en: "",
    "accessDescription_es-AR": "",
    accessDescription_pt: "",
    price,
    documentId,
    liftingMean: lifting_mean,
  };

  formData[getAccessNameKey(defaultLocale)] = defaultName;
  formData[getAccessDescriptionKey(defaultLocale)] = defaultDescription || "";

  localizations.map((localization) => {
    const { locale, name, description } = localization;
    formData[getAccessNameKey(locale)] = name;
    formData[getAccessDescriptionKey(locale)] = description || "";
  });

  return formData;
};

export const createAccessTicketAdapter = (
  values: CreateAccessTicketFormData,
  locale: Locales,
): PostAccessTicketRequest => {
  const reqBody: PostAccessTicketRequest = {
    data: {
      price: values.price,
      name: values[getAccessNameKey(locale)],
      description: values[getAccessDescriptionKey(locale)] || "",
      lifting_mean: values.liftingMean,
    },
  };

  return reqBody;
};

export const updateAccessTicketAdapter = (
  values: UpdateAccessTicketFormData,
  locale: Locales,
): UpdateAccessTicketRequest => {
  const reqBody: UpdateAccessTicketRequest = {
    data: {},
  };

  if (values.price !== undefined) reqBody.data.price = values.price;
  if (values[getAccessNameKey(locale)] !== undefined)
    reqBody.data.name = values[getAccessNameKey(locale)];
  if (values[getAccessDescriptionKey(locale)] !== undefined)
    reqBody.data.description = values[getAccessDescriptionKey(locale)] || "";
  if (values.liftingMean !== undefined)
    reqBody.data.lifting_mean = values.liftingMean;

  return reqBody;
};

export const getActivityAdapter = (
  activity: GetActivityResponse,
): UpdateActivityFormData => {
  const {
    activity_translations = [],
    price,
    minAge,
    maxAge,
    documentId,
    available,
    isActive,
    label,
  } = activity.data;

  const { documentId: activityTranslationDocumentId } =
    activity_translations?.[0] || [];

  const formData: UpdateActivityFormData = {
    "activityName_es-AR": "",
    activityName_en: "",
    activityName_pt: "",
    "description_es-AR": "",
    description_en: "",
    description_pt: "",
    "requirements_es-AR": "",
    requirements_en: "",
    requirements_pt: "",
    season: activity.data.season,
    price,
    activityDocumentId: documentId,
    minAge,
    maxAge: maxAge ?? undefined,
    activityTranslationDocumentId,
    available,
    isActive,
    label,
  };

  activity_translations.map((atrans) => {
    const { locale, name, description, requirements } = atrans;

    formData[getActivityNameKey(locale)] = name;
    formData[getActivityDescriptionKey(locale)] = description ?? "";
    formData[getActivityRequirementsKey(locale)] = requirements ?? "";
  });

  return formData;
};

export const createActivityAdapter = (
  values: CreateActivityFormData,
): PostActivityRequest => {
  const reqBody: PostActivityRequest = {
    data: {
      price: values.price,
      minAge: values.minAge,
      season: values.season,
      available: values.available,
    },
  };

  if (values.maxAge) reqBody.data.maxAge = values.maxAge;
  if ("isActive" in values && typeof values.isActive === "boolean")
    reqBody.data.isActive = values.isActive;

  return reqBody;
};

export const updateActivityAdapter = (
  activity: Partial<UpdateActivityFormData>,
): UpdateActivityRequest => {
  const reqBody: UpdateActivityRequest = {
    data: {},
  };

  if (activity.price !== undefined) reqBody.data.price = activity.price;
  if (activity.minAge !== undefined) reqBody.data.minAge = activity.minAge;
  if (activity.maxAge !== undefined) reqBody.data.maxAge = activity.maxAge;
  if (activity.season !== undefined) reqBody.data.season = activity.season;
  if (activity.available !== undefined)
    reqBody.data.available = activity.available;
  if (activity.isActive !== undefined)
    reqBody.data.isActive = activity.isActive;

  return reqBody;
};

export const createActivityTranslationAdapter = ({
  values,
  relatedActivityDocumentId,
  locale,
}: {
  values: CreateActivityFormData;
  relatedActivityDocumentId: string;
  locale: Locales;
}): PostActivityTranslationRequest => {
  const reqBody: PostActivityTranslationRequest = {
    data: {
      name: "",
      description: "",
      activity: { connect: [{ documentId: relatedActivityDocumentId }] },
    },
  };

  const nameKey = getActivityNameKey(locale);
  const descKey = getActivityDescriptionKey(locale);
  const reqKey = getActivityRequirementsKey(locale);

  reqBody.data.name = values[nameKey];
  reqBody.data.description = values[descKey];
  if (values[reqKey]) reqBody.data.requirements = values[reqKey];

  return reqBody;
};

export const updateActivityTranslationAdapter = ({
  values,
  locale,
}: {
  values: UpdateActivityFormData;
  locale: Locales;
}): UpdateActivityTranslationRequest => {
  const { activityDocumentId } = values;
  const reqBody: UpdateActivityTranslationRequest = {
    data: {
      activity: { connect: [{ documentId: activityDocumentId }] },
    },
  };

  const nameKey = getActivityNameKey(locale);
  const descKey = getActivityDescriptionKey(locale);
  const reqKey = getActivityRequirementsKey(locale);

  reqBody.data.name = values[nameKey];
  reqBody.data.description = values[descKey];
  reqBody.data.requirements = values[reqKey];

  return reqBody;
};
