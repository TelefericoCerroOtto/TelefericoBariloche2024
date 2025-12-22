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
  UpdateActivityTranslationRequest,
} from "@/types";

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

export const getActivityAdapter = (
  activity: GetActivityResponse,
): UpdateActivityFormData => {
  const {
    activity_translations = [],
    price,
    minAge,
    documentId,
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
  };

  const mapLocales = {
    "es-AR": ["activityName_es-AR", "description_es-AR", "requirements_es-AR"],
    en: ["activityName_en", "description_en", "requirements_en"],
    pt: ["activityName_pt", "description_pt", "requirements_pt"],
  } as const;

  activity_translations.map((atrans) => {
    const { locale, name, description, requirements } = atrans;
    const [nameKey, descKey, reqKey] = mapLocales[locale];
    formData[nameKey] = name;
    formData[descKey] = description ?? "";
    formData[reqKey] = requirements ?? "";
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
    },
  };

  return reqBody;
};

export const updateActivityAdapter = createActivityAdapter;

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
      requirements: "",
      activity: { connect: [{ documentId: relatedActivityDocumentId }] },
    },
  };

  const mapLocales = {
    "es-AR": ["activityName_es-AR", "description_es-AR", "requirements_es-AR"],
    en: ["activityName_en", "description_en", "requirements_en"],
    pt: ["activityName_pt", "description_pt", "requirements_pt"],
  } as const;

  const [nameKey, descKey, reqKey] = mapLocales[locale];
  reqBody.data.name = values[nameKey];
  reqBody.data.description = values[descKey] || "";
  reqBody.data.requirements = values[reqKey] || "";

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
      name: "",
      description: "",
      requirements: "",
      activity: { connect: [{ documentId: activityDocumentId }] },
    },
  };

  const mapLocales = {
    "es-AR": ["activityName_es-AR", "description_es-AR", "requirements_es-AR"],
    en: ["activityName_en", "description_en", "requirements_en"],
    pt: ["activityName_pt", "description_pt", "requirements_pt"],
  } as const;
  const [nameKey, descKey, reqKey] = mapLocales[locale];
  reqBody.data.name = values[nameKey];
  reqBody.data.description = values[descKey];
  reqBody.data.requirements = values[reqKey];

  return reqBody;
};
