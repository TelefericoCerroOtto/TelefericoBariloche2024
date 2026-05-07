import type {
  CvStorageDriver,
  Meta,
  Postulation,
  StoredCvFile,
  StrapiRecord,
} from "@/types";

export type GetPostulationResponse = {
  data: Postulation;
  meta: Meta;
};

export type GetPostulationsResponse = {
  data: Postulation[];
  meta: Meta;
};

export type PostPostulationRequest = {
  data: Pick<
    Postulation,
    | "name"
    | "surname"
    | "gender"
    | "age"
    | "email"
    | "campNo"
    | "note"
    | "postulation_status"
  > & {
    sector: {
      connect: [{ documentId: string }];
    };
    cvObjectKey: StoredCvFile["objectKey"];
    cvOriginalName: StoredCvFile["originalName"];
    cvMimeType: StoredCvFile["mimeType"];
    cvSize: StoredCvFile["size"];
    cvUploadedAt: StoredCvFile["uploadedAt"];
    cvStorageProvider: CvStorageDriver;
    cvBucket?: string;
  };
};

export type PostPostulationResponse = {
  data: StrapiRecord<Omit<Postulation, "faved_by" | "sector">>;
  meta: Meta;
};

export type UpdatePostulationRequest = {
  data: Partial<
    Pick<Postulation, "postulation_status"> & {
      faved_by:
        | {
            connect: number[];
          }
        | {
            disconnect: number[];
          };
    }
  >;
};

export type UpdatePostulationResponse = {
  data: StrapiRecord<Omit<Postulation, "faved_by" | "sector">>;
  meta: Meta;
};
