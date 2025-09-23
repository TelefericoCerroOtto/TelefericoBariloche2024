"use server";

import { postPostulationAdapter } from "@/lib/adapters";
import { postPostulation, uploadResume } from "@/lib/services";
import type { PostulationFormData } from "@/types";

export const sendPostulationAction = async (
  postulation: PostulationFormData,
) => {
  const adaptedPostulation = postPostulationAdapter(postulation);
  const postulationRes = await postPostulation(adaptedPostulation);
  const postulationId = postulationRes.data?.data?.id;

  if (!postulationRes.ok || !postulationId) {
    return postulationRes;
  }
  const uploadRes = await uploadResume(
    postulation.resume,
    postulationId,
  );

  return { ok: uploadRes, data: { postulationRes, uploadRes } };
};
