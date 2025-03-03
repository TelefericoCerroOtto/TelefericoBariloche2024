import type {
  PostPostulationRequest,
  PostPostulationResponse,
  UploadResumeResponse,
} from "@/types";
import { fetchWrapper } from "@/utils/fetch";
import { getStrapiURL } from "@/utils/get-strapi-url";
import { STRAPI_ENDPOINTS } from "@/utils/routes.const";

export const postPostulation = async (postulation: PostPostulationRequest) => {
  const res = await fetchWrapper<PostPostulationResponse>(
    getStrapiURL(STRAPI_ENDPOINTS.POSTULATIONS),
    {
      method: "POST",
      body: JSON.stringify({ data: postulation }),
    },
  );

  return res;
};

export const uploadResume = async (resume: File, postulationId: number) => {
  const formData = new FormData();

  formData.append("files", resume);
  // TODO: estos campos son para hacer la relacion del archivo multimedia al campo correspondiente de la coleccion de postulaciones. Por alguna razon no funciona. Arreglar
  // more info at https://docs.strapi.io/dev-docs/plugins/upload#upload-entry-files
  formData.append("ref", "api::postulation.postulation"); // Collection id
  formData.append("refId", postulationId.toString()); // entry id
  formData.append("field", "resume"); // field to relate

  const res = await fetchWrapper<UploadResumeResponse>(
    getStrapiURL(STRAPI_ENDPOINTS.UPLOADS),
    {
      method: "POST",
      body: formData,
    },
  );

  return res;
};
