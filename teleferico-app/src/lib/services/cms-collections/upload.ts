import type { UploadMediaResponse } from "@/types";
import { STRAPI_ENDPOINTS, fetchWrapper, getStrapiURL } from "@/utils";

export const uploadMedia = async (file: File) => {
  const formData = new FormData();
  formData.append("files", file);

  const res = await fetchWrapper<UploadMediaResponse>(
    getStrapiURL(STRAPI_ENDPOINTS.UPLOADS),
    {
      method: "POST",
      body: formData,
    },
    "Failed to upload media file",
  );

  return res;
};
