import type {
  FormProtectionDecision,
  FormProtectionReviewStatus,
  FormProtectionSubmission,
  Meta,
  StrapiRecord,
} from "@/types";

export type GetFormProtectionSubmissionsResponse = {
  data: FormProtectionSubmission[];
  meta: Meta;
};

export type PostFormProtectionSubmissionRequest = {
  data: {
    form: "contact" | "postulation";
    normalizedEmailHash: string;
    // In the current app flow, the selected sector document id is the
    // postulation duplicate key.
    sectorDocumentId?: string | null;
    positionKey?: string | null;
    decision: FormProtectionDecision;
    duplicateMarker: boolean;
    reviewStatus?: FormProtectionReviewStatus;
    banned?: boolean;
    notes?: string | null;
    threshold?: number | null;
    windowMs?: number | null;
    submittedAt: string;
    metadata?: Record<string, unknown> | null;
    fingerprint?: Record<string, unknown> | null;
    signal?: Record<string, unknown> | null;
  };
};

export type PostFormProtectionSubmissionResponse = {
  data: StrapiRecord<Omit<FormProtectionSubmission, "locale"> & { locale: null }>;
  meta: Meta;
};
