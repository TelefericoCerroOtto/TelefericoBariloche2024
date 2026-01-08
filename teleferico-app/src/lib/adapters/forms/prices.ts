import type {
  CreateActivityFormData,
  ExtendLocalizations,
  GetActivityResponse,
  GetTicketResponse,
  Locales,
  PostActivityRequest,
  PostActivityTranslationRequest,
  UpdateAccessTicketFormData,
  UpdateActivityFormData,
  UpdateActivityRequest,
  UpdateActivityTranslationRequest,
} from "@/types";

const getAccessNameKey = (locale: Locales) => `accessName_${locale}` as const;
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

  formData[getAccessNameKey(defaultLocale)] = defaultName;

  localizations.map((localization) => {
    const { locale, name } = localization;
    formData[getAccessNameKey(locale)] = name;
  });

  return formData;
};

export const getActivityAdapter = (
  activity: GetActivityResponse,
): UpdateActivityFormData => {
  const {
    activity_translations = [],
    price,
    minAge,
    documentId,
    available,
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
    activityTranslationDocumentId,
    available,
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
  if (activity.season !== undefined) reqBody.data.season = activity.season;
  if (activity.available !== undefined)
    reqBody.data.available = activity.available;

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
