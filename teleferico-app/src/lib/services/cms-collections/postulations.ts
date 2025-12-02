import type { PostPostulationRequest, PostPostulationResponse } from "@/types";
import { STRAPI_ENDPOINTS, fetchWrapper, getStrapiURL } from "@/utils";

export const createPostulation = async (
  token: string,
  reqBody: PostPostulationRequest,
) => {
  const res = await fetchWrapper<PostPostulationResponse>(
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
