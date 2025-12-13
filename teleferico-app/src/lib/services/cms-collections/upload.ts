import type { StrapiFile, StrapiImage, UploadMediaResponse } from "@/types";
import { strapiFetch } from "@/lib/http/clients/strapi-fetch";
import { STRAPI_ENDPOINTS, getStrapiURL } from "@/utils";

const uploadMedia = async <T>(file: File, jwt: string) => {
  const formData = new FormData();
  formData.append("files", file);

  const res = await strapiFetch<T>(
    getStrapiURL(STRAPI_ENDPOINTS.UPLOAD_API),
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
