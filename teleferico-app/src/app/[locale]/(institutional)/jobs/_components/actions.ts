"use server";

import { postPostulationAdapter } from "@/lib/adapters";
import { postPostulation, uploadResume } from "@/lib/services";
import type { PostulationFormData } from "@/types";

export const sendPostulationAction = async (
  postulation: PostulationFormData,
) => {
  const adaptedPostulation = postPostulationAdapter(postulation);
  return { ok: true, data: "Complete postulate action" };
  const postulationRes = await postPostulation(adaptedPostulation);
  if (!postulationRes.ok) {
    return postulationRes;
  }
  const uploadRes = await uploadResume(
    postulation.resume,
    postulationRes.data.data.id,
  );

  return { ok: uploadRes, data: { postulationRes, uploadRes } };
};
