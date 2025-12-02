import {
  PostPostulationRequest,
  PostulationFormData,
  PostulationRequestPayload,
} from "@/types";

export function asString(value: FormDataEntryValue | null): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export function asNumber(value: FormDataEntryValue | null): number | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (trimmed === "") return undefined;
  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export const sendPostulationAdapter = (
  values: PostulationRequestPayload,
): FormData => {
  const formData = new FormData();

  formData.append("name", values.name);
  formData.append("surname", values.surname);
  formData.append("genre", values.genre);
  formData.append("age", String(values.age));
  formData.append("email", values.email);
  formData.append("sector", values.sector);
  formData.append("resume", values.resume);

  if (values.campNo != null) {
    formData.append("campNo", String(values.campNo));
  }

  if (values.note) {
    formData.append("note", values.note);
  }

  formData.append("honeypot", values.honeypot ?? "");
  formData.append("formLoadedAt", String(values.formLoadedAt));

  return formData;
};

export const postulationFormDataAdapter = (formData: FormData) => {
  const rawName = formData.get("name");
  const rawSurname = formData.get("surname");
  const rawGenre = formData.get("genre");
  const rawAge = formData.get("age");
  const rawEmail = formData.get("email");
  const rawSector = formData.get("sector");
  const rawCampNo = formData.get("campNo");
  const rawNote = formData.get("note");
  const rawResume = formData.get("resume");

  return {
    name: asString(rawName),
    surname: asString(rawSurname),
    genre: asString(rawGenre),
    age: asNumber(rawAge),
    email: asString(rawEmail),
    sector: asString(rawSector),
    note: asString(rawNote),
    campNo: asNumber(rawCampNo),
    resume: rawResume,
  };
};

export const createPostulationAdapter = (
  values: PostulationFormData & { resumeId: number },
): PostPostulationRequest => {
  const { name, surname, age, email, sector, genre, resumeId, campNo, note } =
    values;
  const reqBody: PostPostulationRequest = {
    data: {
      name,
      surname,
      genre,
      age,
      email,
      campNo: undefined,
      note: undefined,
      sector: {
        connect: [{ documentId: sector }],
      },
      resume: resumeId,
    },
  };

  if (campNo != null || campNo !== undefined) {
    reqBody.data.campNo = campNo;
  }

  if (note) {
    reqBody.data.note = note;
  }

  return reqBody;
};
