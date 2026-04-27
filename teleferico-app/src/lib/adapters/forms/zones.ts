import type {
  GetZoneResponse,
  Locales,
  UpdateZoneRequest,
  UpdateZoneTranslationRequest,
  UpdateZoneFormData,
  CreateZoneFormData,
  CreateZoneTranslationRequest,
  CreateZoneRequest,
} from "@/types";
import { TimeValueToStrapiTime } from "../formats";

export const getZoneAdapter = (zone: GetZoneResponse): UpdateZoneFormData => {
  const {
    openTime,
    closeTime,
    isOpen,
    featured,
    hide,
    documentId,
    zone_translations,
    label,
  } = zone.data;
  const { documentId: zoneTranslationDocumentId } = zone_translations[0];
  const [openHour, openMins] = openTime.split(":").map(Number);
  const [closeHour, closeMins] = closeTime.split(":").map(Number);

  const formData: UpdateZoneFormData = {
    label,
    "zoneName_es-AR": "",
    zoneName_en: "",
    zoneName_pt: "",
    "zoneDescription_es-AR": "",
    zoneDescription_en: "",
    zoneDescription_pt: "",
    openTime: {
      hour: openHour,
      mins: openMins,
    },
    closeTime: {
      hour: closeHour,
      mins: closeMins,
    },
    isOpen,
    featured,
    hide,
    documentId,
    zoneTranslationDocumentId,
  };

  const mapLocales = {
    "es-AR": ["zoneName_es-AR", "zoneDescription_es-AR"],
    en: ["zoneName_en", "zoneDescription_en"],
    pt: ["zoneName_pt", "zoneDescription_pt"],
  } as const;

  zone_translations.map((ztrans) => {
    const { locale, name, description } = ztrans;
    formData[mapLocales[locale][0]] = name;
    formData[mapLocales[locale][1]] = description || "";
  });

  return formData;
};

export const createZoneAdapter = (
  zone: CreateZoneFormData,
): CreateZoneRequest => {
  const reqBody: CreateZoneRequest = {
    data: {
      openTime: TimeValueToStrapiTime(zone.openTime),
      closeTime: TimeValueToStrapiTime(zone.closeTime),
      isOpen: zone.isOpen,
      label: zone.label,
      featured: zone.featured,
      hide: zone.hide,
    },
  };

  return reqBody;
};

export const updateZoneAdapter = (
  zone: Partial<UpdateZoneFormData>,
): UpdateZoneRequest => {
  const reqBody: { data: Record<string, unknown> } = { data: {} };

  // Solo agrega si viene definido (no null/undefined)
  if (zone.openTime != null) {
    reqBody.data.openTime = TimeValueToStrapiTime(zone.openTime);
  }
  if (zone.closeTime != null) {
    reqBody.data.closeTime = TimeValueToStrapiTime(zone.closeTime);
  }

  // Para booleanos: no usar truthy; chequear presencia y tipo
  if ("isOpen" in zone && typeof zone.isOpen === "boolean") {
    reqBody.data.isOpen = zone.isOpen;
  }

  if ("featured" in zone && typeof zone.featured === "boolean") {
    reqBody.data.featured = zone.featured;
  }

  if ("hide" in zone && typeof zone.hide === "boolean") {
    reqBody.data.hide = zone.hide;
  }

  return reqBody as UpdateZoneRequest;
};

export const createZoneTranslationAdapter = ({
  zone,
  relatedZoneDocumentId,
  locale,
}: {
  zone: CreateZoneFormData;
  relatedZoneDocumentId: string;
  locale: Locales;
}): CreateZoneTranslationRequest => {
  const reqBody: CreateZoneTranslationRequest = {
    data: {
      name: zone[`zoneName_${locale}`],
      description: zone[`zoneDescription_${locale}`] || "",
      zone: { connect: [{ documentId: relatedZoneDocumentId }] },
    },
  };

  return reqBody;
};

export const updateZoneTranslationAdapter = (
  zone: UpdateZoneFormData,
  locale: Locales,
): UpdateZoneTranslationRequest => {
  const reqBody: UpdateZoneTranslationRequest = {
    data: {
      name: "",
      description: "",
      zone: { connect: [{ documentId: zone.documentId }] },
    },
  };

  reqBody.data.name = zone[`zoneName_${locale}`];
  reqBody.data.description = zone[`zoneDescription_${locale}`] || "";

  return reqBody;
};
