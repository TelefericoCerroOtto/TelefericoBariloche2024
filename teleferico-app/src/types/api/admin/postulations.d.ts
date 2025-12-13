import { PostulationStatus } from "@/types";

export type FavPostulationRequestPayload = { favorite: boolean };

export type PostulationsBulkStatusRequestPayload = {
  documentIds: string[];
  postulationStatus: PostulationStatus;
};

export type PostulationBulkStatusApiResponse = {
  ok: boolean;
  message: string;
  data?: {
    successCount: number;
    failureCount: number;
  };
};
