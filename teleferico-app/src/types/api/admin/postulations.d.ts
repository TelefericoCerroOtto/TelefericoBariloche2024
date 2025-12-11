import { PostulationStatus } from "@/types";

export type FavPostulationRequestPayload = { favorite: boolean };

export type PostulationsBulkStatusRequestPayload = {
  ids: string[];
  postulationStatus: PostulationStatus;
};
