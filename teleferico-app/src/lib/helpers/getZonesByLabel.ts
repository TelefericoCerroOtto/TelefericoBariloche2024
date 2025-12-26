import qs from "qs";
import { STRAPI_ENDPOINTS } from "../constants/routes.const";
import { strapiFetch } from "../http/clients/strapi-fetch";
import { stringifyQuery } from "@/utils";

/**
 * Fetch Zones by their unique `label` values.
 *
 * WHY:
 * HoursOverview translations can reference dynamic schedules via markers such as
 * "{base.openTime}" or "{summit.closeTime}". Those markers must be resolved using
 * the Zone collection so that operational schedules can be updated centrally in Strapi
 * without rewriting translation copy.
 *
 * HOW:
 * - Receives a list of labels extracted from the translation BlocksContent.
 * - Queries Strapi using filters[label][$in] and requests only the needed fields:
 *   label, openTime, closeTime.
 * - Does NOT populate relations (zone_translations) because they're not needed for
 *   schedule injection.
 *
 * NOTES:
 * - `openTime` and `closeTime` are stored as "hh:mm:ss" and are normalized to "hh:mm"
 *   at render time.
 */

type ZoneDTO = {
  label: string;
  openTime: string | null;
  closeTime: string | null;
};

type ZonesResponse = {
  data: Array<{ id: number; attributes: ZoneDTO }>; // si tu Strapi response es v4-like
  // o adaptalo a tu shape v5, según tu wrapper
};

export async function getZonesByLabels(labels: string[]) {
  const query = qs.stringify(
    {
      filters: { label: { $in: labels } },
      fields: ["label", "openTime", "closeTime"],
      pagination: { pageSize: Math.max(labels.length, 10) },
    },
    { encodeValuesOnly: true },
  );

  return strapiFetch<ZonesResponse>({
    endpoint: STRAPI_ENDPOINTS.ZONES,
    qp: stringifyQuery(query),
  });
}
