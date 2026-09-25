import { describe, expect, it } from "vitest";
import {
  buildAuthoritativeGenerationInputsV1,
  type AuthoritativeGenerationSourceInputV1,
  type GenerationSourcePageQueryV1,
} from "../../../services/survey-report-worker/src/authoritative-generation-source";

const CUTOFF = "2026-09-02T12:00:00.000Z";
const RANGE = { from: "2026-09-01", to: "2026-09-10" };

type FailureCase =
  | "missingComment"
  | "missingPayloadDigest"
  | "incompletePages"
  | "repeatedCursor"
  | "malformedRow"
  | "duplicateSubmission"
  | "ambiguousDefinitions"
  | "missingRelation"
  | "wrongPointRelationId"
  | "wrongVersionRelationId"
  | "missingPointRelationId"
  | "missingVersionRelationId"
  | "invalidQrSource";

function makeSource(failure?: FailureCase): AuthoritativeGenerationSourceInputV1 & {
  readonly pageQueries: GenerationSourcePageQueryV1[];
} {
  const submissions: unknown[] = [
    submission("previous", "2026-08-31T15:00:00.000Z", "previous comment"),
    submission("current", "2026-09-02T10:00:00.000Z", "current comment"),
    submission("late", "2026-09-03T15:00:00.000Z", "late comment"),
  ];
  const versions = [version()];
  if (failure === "missingComment") delete (submissions[0] as Record<string, unknown>).comment;
  if (failure === "missingPayloadDigest")
    delete (submissions[0] as Record<string, unknown>).payloadDigest;
  if (failure === "missingRelation")
    (submissions[0] as Record<string, unknown>).qrPoint = null;
  if (failure === "wrongPointRelationId")
    ((submissions[0] as Record<string, unknown>).qrPoint as Record<string, unknown>).id = "point-row-other";
  if (failure === "wrongVersionRelationId")
    ((submissions[0] as Record<string, unknown>).surveyVersion as Record<string, unknown>).id = "version-row-other";
  if (failure === "missingPointRelationId")
    delete ((submissions[0] as Record<string, unknown>).qrPoint as Record<string, unknown>).id;
  if (failure === "missingVersionRelationId")
    delete ((submissions[0] as Record<string, unknown>).surveyVersion as Record<string, unknown>).id;
  if (failure === "invalidQrSource")
    (submissions[0] as Record<string, unknown>).source = "manual";
  if (failure === "malformedRow") submissions[0] = null;
  if (failure === "duplicateSubmission") submissions.push(submission("previous", "2026-08-31T15:00:00.000Z", "duplicate"));
  if (failure === "ambiguousDefinitions")
    versions[0]!.aspects.push({ aspectKey: "views", sortOrder: 1 });
  const pageQueries: GenerationSourcePageQueryV1[] = [];
  return {
    range: RANGE,
    dataCutoffAt: CUTOFF,
    sourceRevision: "source-revision-17",
    modelConfig: modelConfig(),
    pricingSnapshot: {
      version: "pricing.v1",
      currency: "USD",
      units: [{ sku: "gemini-input", inputMicrosPerMillion: 1, outputMicrosPerMillion: 2 }],
    },
    evidenceKeyId: "synthetic-key-1",
    pageQueries,
    readPage: async (query: GenerationSourcePageQueryV1) => {
      pageQueries.push(query);
      const { resource, cursor } = query;
      const rows = resource === "submissions"
        ? submissions
        : resource === "versions"
          ? versions
          : [point()];
      const chunks = resource === "submissions" ? [rows.slice(0, 1), rows.slice(1)] : [rows];
      const pageIndex = cursor === null ? 0 : Number(cursor);
      if (failure === "repeatedCursor" && resource === "submissions") {
        return {
          cursor,
          items: chunks[pageIndex] ?? [],
          total: rows.length,
          nextCursor: "loop",
        };
      }
      return {
        cursor,
        items: chunks[pageIndex] ?? [],
        total: rows.length + (failure === "incompletePages" && resource === "submissions" ? 1 : 0),
        nextCursor: pageIndex + 1 < chunks.length ? String(pageIndex + 1) : null,
      };
    },
  };
}

function modelConfig() {
  return {
    version: "survey-model-config.v1",
    evidenceKeyId: "synthetic-key-1",
    provider: "vertex-ai",
    vertexProjectId: "teleferico-bariloche-2024",
    vertexLocation: "us",
    vertexApiEndpoint: "aiplatform.us.rep.googleapis.com",
    model: "gemini-3.8-flash",
    temperature: 0,
    reasoning: "LOW",
    grounding: false,
    promptVersion: "prompt.v1",
    mapSchemaVersion: "survey-map.v1",
    analysisSchemaVersion: "survey-analysis.v1",
    redactionVersion: "redaction.v1",
    validatorVersion: "validator.v1",
    chunkVersion: "chunk.v1",
    verifiedInputTokenLimit: 10000,
    map: { targetMin: 600, targetMax: 1200, hardMax: 4000 },
    directReduce: { targetMin: 1800, targetMax: 3000, hardMax: 8000 },
    safetyHeadroomTokens: 2048,
    sourceRevision: "source-revision-17",
  } as const;
}

function submission(id: string, acceptedAt: string, comment: string) {
  return {
    id,
    receipt: `receipt-${id}`,
    acceptedAt,
    source: "valid_qr",
    locale: "es",
    overallRating: 5,
    comment,
    payloadDigest: "a".repeat(64),
    qrPoint: { id: "point-row-1", pointKey: "summit" },
    surveyVersion: { id: "version-row-1", versionKey: "v1" },
    ratings: [{ aspectKey: "views", label: "Views", sortOrder: 0, rating: "positive" }],
  };
}

function version() {
  return {
    id: "version-row-1",
    versionKey: "v1",
    aspects: [{ aspectKey: "views", sortOrder: 0 }],
  };
}

function point() {
  return { id: "point-row-1", pointKey: "summit", displayName: "Summit", sortOrder: 0 };
}

describe("authoritative generation source adapter", () => {
  it("reads every page and materializes current and previous-period data at the frozen cutoff", async () => {
    const source = makeSource();
    const result = await buildAuthoritativeGenerationInputsV1(source);

    expect(result.snapshotJson.population.previousSubmissionCount).toBe(1);
    expect(result.snapshotJson.population.currentSubmissionCount).toBe(1);
    expect(result.snapshotJson.population.excludedAfterCutoffCount).toBe(1);
    expect(result.snapshotJson.comments.map(({ text }) => text)).toEqual([
      "current comment",
      "previous comment",
    ]);
    expect(result.snapshotJson.population.dataCutoffAt).toBe(CUTOFF);
    expect(result.checkpointsJson.entries).toEqual([]);
    expect(Object.isFrozen(result.snapshotJson)).toBe(true);
    expect(source.pageQueries.map(({ resource }) => resource).sort()).toEqual([
      "points",
      "submissions",
      "submissions",
      "versions",
    ]);
    expect(source.pageQueries.every(({ dataCutoffAt }) => dataCutoffAt === CUTOFF)).toBe(true);
    expect(source.pageQueries.every(({ acceptedAtGte }) => acceptedAtGte.startsWith("2026-08-22"))).toBe(true);
    expect(source.pageQueries.every(({ acceptedAtLte }) => acceptedAtLte.startsWith("2026-09-11"))).toBe(true);
  });

  it.each([
    ["missing private comment", "missingComment"],
    ["missing private payload digest", "missingPayloadDigest"],
    ["incomplete page totals", "incompletePages"],
    ["repeated cursor", "repeatedCursor"],
    ["malformed row", "malformedRow"],
    ["duplicate submission identity", "duplicateSubmission"],
    ["ambiguous definitions", "ambiguousDefinitions"],
    ["missing required relation", "missingRelation"],
    ["known point key with another relation ID", "wrongPointRelationId"],
    ["known version key with another relation ID", "wrongVersionRelationId"],
    ["point relation without its ID", "missingPointRelationId"],
    ["version relation without its ID", "missingVersionRelationId"],
    ["non-QR source", "invalidQrSource"],
  ])("fails closed for %s", async (_label, option) => {
    await expect(
      buildAuthoritativeGenerationInputsV1(makeSource(option as FailureCase)),
    ).rejects.toThrow("INVALID_GENERATION_SOURCE");
  });

  it.each(["modelConfig", "pricingSnapshot", "evidenceKeyId"] as const)(
    "fails closed when the explicit %s input is missing",
    async (missingInput) => {
      const source = makeSource();
      const input = { ...source, [missingInput]: undefined };
    await expect(
        buildAuthoritativeGenerationInputsV1(
          input as unknown as AuthoritativeGenerationSourceInputV1,
        ),
    ).rejects.toThrow("INVALID_GENERATION_SOURCE");
    },
  );
});
