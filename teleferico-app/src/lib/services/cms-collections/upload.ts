import type { StrapiFile, StrapiImage, UploadMediaResponse } from "@/types";
import { STRAPI_ENDPOINTS, fetchWrapper, getStrapiURL } from "@/utils";

const uploadMedia = async <T>(file: File, jwt: string) => {
  const formData = new FormData();
  formData.append("files", file);

  const res = await fetchWrapper<T>(
    getStrapiURL(STRAPI_ENDPOINTS.UPLOADS),
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
      body: formData,
    },
    "Failed to upload media file",
  );

  return res;
};

export const uploadImage = uploadMedia<UploadMediaResponse<StrapiImage>>;
export const uploadFile = uploadMedia<UploadMediaResponse<StrapiFile>>;
