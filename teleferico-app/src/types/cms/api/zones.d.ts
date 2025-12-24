import type { Meta, Zone, ZoneTranslation } from "@/types";

export type GetZoneResponse = {
  data: Zone;
  meta: Meta;
};

export type GetZonesResponse = {
  data: Zone[];
  meta: Meta;
};

export type UpdateZoneRequest = {
  data: Partial<Pick<Zone, "openTime" | "closeTime" | "isOpen">>;
};

export type UpdateZoneResponse = {
  data: Omit<Zone, "zone_translations">;
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
