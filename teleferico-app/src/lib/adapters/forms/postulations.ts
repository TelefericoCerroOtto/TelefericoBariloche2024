import type { PostPostulationRequest, PostulationFormData } from "@/types";

export const postPostulationAdapter = (
  postulation: PostulationFormData,
): PostPostulationRequest => {
  // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
  const { sector, resume: _, ...props } = postulation;

  const adaptedPostulation: PostPostulationRequest = {
    data: {
      ...props,
      sector: { connect: [{ documentId: sector }] },
    },
  };

  return adaptedPostulation;
};
