import { STRAPI_ENDPOINTS } from "@/lib/constants/routes.const";
import { strapiFetch } from "@/lib/http/clients/strapi-fetch";
import type {
  PostPostulationRequest,
  PostPostulationResponse,
  UpdatePostulationRequest,
  UpdatePostulationResponse,
} from "@/types";

export const createPostulation = async (
  token: string,
  reqBody: PostPostulationRequest,
) => {
  const res = await strapiFetch<PostPostulationResponse>(
    { endpoint: STRAPI_ENDPOINTS.POSTULATIONS },
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
    { endpoint: `${STRAPI_ENDPOINTS.POSTULATIONS}/${documentId}` },
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
