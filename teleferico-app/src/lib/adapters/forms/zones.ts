import type {
  GetZoneResponse,
  Locales,
  UpdateZoneRequest,
  UpdateZoneTranslationRequest,
  ZoneFormData,
} from "@/types";
import { TimeValueToStrapiTime } from "../formats";

export const getZoneAdapter = (zone: GetZoneResponse): ZoneFormData => {
  const { openTime, closeTime, isOpen, documentId, zone_translations } =
    zone.data;
  const { documentId: zoneTrasnlationDocumentId } = zone_translations[0];
  const [openHour, openMins] = openTime.split(":").map(Number);
  const [closeHour, closeMins] = closeTime.split(":").map(Number);

  const formData: ZoneFormData = {
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
    documentId,
    zoneTrasnlationDocumentId,
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

export const updateZoneAdapter = (
  zone: ZoneFormData | Partial<ZoneFormData>,
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

  return reqBody as UpdateZoneRequest;
};

export const updateZoneTranslationAdapter = (
  zone: ZoneFormData,
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
