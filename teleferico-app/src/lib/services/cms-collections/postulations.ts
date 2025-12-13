import { strapiFetch } from "@/lib/http/clients/strapi-fetch";
import type {
  PostPostulationRequest,
  PostPostulationResponse,
  UpdatePostulationRequest,
  UpdatePostulationResponse,
} from "@/types";
import { STRAPI_ENDPOINTS, getStrapiURL } from "@/utils";

export const createPostulation = async (
  token: string,
  reqBody: PostPostulationRequest,
) => {
  const res = await strapiFetch<PostPostulationResponse>(
    getStrapiURL(STRAPI_ENDPOINTS.POSTULATIONS),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(reqBody),
    },
  );

  return res;
};

export const updatePostulation = async (
  {
    reqBody,
    documentId,
  }: { reqBody: UpdatePostulationRequest; documentId: string },
  jwt: string,
) => {
  const res = await strapiFetch<UpdatePostulationResponse>(
    getStrapiURL(`${STRAPI_ENDPOINTS.POSTULATIONS}/${documentId}`),
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify(reqBody),
    },
  );

  return res;
};
