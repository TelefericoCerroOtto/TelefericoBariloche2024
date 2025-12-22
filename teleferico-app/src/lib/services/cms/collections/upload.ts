import { STRAPI_ENDPOINTS } from "@/lib/constants/routes.const";
import { strapiFetch } from "@/lib/http/clients/strapi-fetch";
import type { StrapiFile, StrapiImage, UploadMediaResponse } from "@/types";

const uploadMedia = async <T>(file: File, jwt: string) => {
  const formData = new FormData();
  formData.append("files", file);

  const res = await strapiFetch<T>(
    { endpoint: STRAPI_ENDPOINTS.UPLOAD_API },
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
      body: formData,
    },
    { errorMsg: "Failed to upload media file" },
  );

  return res;
};

export const uploadImage = uploadMedia<UploadMediaResponse<StrapiImage>>;
export const uploadFile = uploadMedia<UploadMediaResponse<StrapiFile>>;
