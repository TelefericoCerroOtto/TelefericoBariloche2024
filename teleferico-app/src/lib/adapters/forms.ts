import type {
  ExtendLocalizations,
  GetTicketResponse,
  NewUserFormData,
  NewUserRequest,
  PostPostulationRequest,
  PostulationFormData,
  UpdateAccessTicketFormData,
  UpdateUserFormData,
  UpdateUserRequest,
} from "@/types";
import { cleanObject } from "@/utils/clean-object";

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
