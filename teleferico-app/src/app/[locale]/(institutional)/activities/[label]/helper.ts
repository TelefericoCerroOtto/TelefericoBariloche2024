import { STRAPI_ENDPOINTS } from "@/lib/constants/routes.const";
import { strapiFetch } from "@/lib/http/clients/strapi-fetch";
import { GetActivitiesResponse } from "@/types";
import { stringifyQuery } from "@/utils";

export const getActivityByLabel = async (label: string) => {
  const query: Record<string, unknown> = {
    filters: {
      label: {
        $eq: label,
      },
      isActive: {
        $eq: true,
      },
    },
    fields: ["id"], // La menor cantidad de campos posibles para optimizar
  };

  const res = await strapiFetch<GetActivitiesResponse>(
    {
      // Esta respuesta no es 100% correcta, pero sirve para tipar
      endpoint: STRAPI_ENDPOINTS.ACTIVITIES,
      qp: stringifyQuery(query),
    },
    { cache: "no-store" },
  );

  return res;
};
