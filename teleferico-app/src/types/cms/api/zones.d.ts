import type { Meta, Zone, ZoneTranslation } from "@/types";

export type GetZoneResponse = {
  data: Zone;
  meta: Meta;
};

export type GetZonesResponse = {
  data: Zone[];
  meta: Meta;
};

export type CreateZoneRequest = {
  data: Pick<
    Zone,
    | "label"
    | "openTime"
    | "closeTime"
    | "isOpen"
    | "featured"
    | "hide"
    | "showInSchedules"
  > & Partial<Pick<Zone, "sortOrder">>;
};

export type CreateZoneResponse = {
  data: Zone;
  meta: Meta;
};

export type UpdateZoneRequest = {
  data: Partial<
    Pick<
      Zone,
      | "openTime"
      | "closeTime"
      | "isOpen"
      | "featured"
      | "hide"
      | "showInSchedules"
      | "sortOrder"
    >
  >;
};

export type UpdateZoneResponse = {
  data: Omit<Zone, "zone_translations">;
  meta: Meta;
};

export type CreateZoneTranslationRequest = {
  data: Pick<ZoneTranslation, "name" | "description"> & {
    zone: { connect: [{ documentId: string }] };
  };
};

export type CreateZoneTranslationResponse = {
  data: ZoneTranslation;
  meta: Meta;
};

export type UpdateZoneTranslationRequest = {
  data: Partial<Pick<ZoneTranslation, "name" | "description">> & {
    zone: { connect: [{ documentId: string }] };
  };
};

export type UpdateZoneTranslationResponse = {
  data: Omit<ZoneTranslation, "zone">;
};
