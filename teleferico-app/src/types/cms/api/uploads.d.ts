import type { StrapiFile, StrapiImage } from "@/types";

export type UploadMediaResponse<T extends StrapiImage | StrapiFile> = T[];
