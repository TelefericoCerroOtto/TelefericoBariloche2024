// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import {
  buildGenerationData,
  buildOverlapDetails,
  captureDataCutoff,
  prepareAtomicCompletion,
  prepareDispatchCompensation,
  prepareRetryGeneration,
} from "./generation-lifecycle";
import { canonicalizeJson } from "../../../packages/survey-reporting-core/src";
import {
  materializeGenerationInputsV1,
  validateMaterializedGenerationInputsV1,
} from "../../../services/survey-report-worker/src/generation-inputs";
const period = { from: "2026-08-01", to: "2026-08-20" } as const;
const source = {
  documentId: "generation-document-1",
  reportRunId: "00000000-0000-4000-8000-000000000001",
  period,
  status: "failed" as const,
  stateVersion: 4,
  dataCutoffAt: "2026-08-21T00:00:00.000Z",
  snapshotDigest: "a".repeat(64),
  sourceRevision: "feedback-admin.v1",
};
const testModelConfig = {
  version: "survey-model-config.v1",
  evidenceKeyId: "evidence-key-2026-01",
  provider: "vertex-ai",
  vertexProjectId: "teleferico-bariloche-2024",
  vertexLocation: "us",
  vertexApiEndpoint: "aiplatform.us.rep.googleapis.com",
  model: "gemini-3.8-flash",
  temperature: 0,
  reasoning: "LOW",
  grounding: false,
  promptVersion: "prompt-v1",
  mapSchemaVersion: "survey-map.v1",
  analysisSchemaVersion: "survey-analysis.v1",
  redactionVersion: "redaction-v1",
  validatorVersion: "validator-v1",
  chunkVersion: "chunk-v1",
  verifiedInputTokenLimit: 10000,
  map: { targetMin: 600, targetMax: 1200, hardMax: 4000 },
  directReduce: { targetMin: 1800, targetMax: 3000, hardMax: 8000 },
  safetyHeadroomTokens: 2048,
  sourceRevision: "source-revision-42",
} as const;

function validMaterializationInput(options: {
  readonly range?: { readonly from: string; readonly to: string };
  readonly cutoff?: string;
} = {}) {
  const range = options.range ?? {
    from: "2026-08-01",
    to: "2026-08-01",
  };
  const cutoff = options.cutoff ?? "2026-08-01T12:00:00.000Z";
  return {
    snapshot: {
      sourceRevision: "source-revision-42",
      createdAt: cutoff,
      dataCutoffAt: cutoff,
      range,
      filters: { pointKey: null, versionKey: null },
      submissions: [],
      definitions: [],
      points: [],
    },
    modelConfig: testModelConfig,
    pricingSnapshot: {
      version: "pricing-2026-01",
      currency: "USD",
      units: [
        {
          sku: "model-input",
          inputMicrosPerMillion: 100,
          outputMicrosPerMillion: 200,
        },
      ],
    },
    evidenceKeyId: "evidence-key-2026-01",
  } as const;
}

describe("report generation lifecycle contracts", () => {
  it("captures a UTC cutoff before snapshot reads", () => {
    expect(captureDataCutoff(new Date("2026-09-22T15:04:05.000Z"))).toBe(
      "2026-09-22T15:04:05.000Z",
    );
    expect(() => captureDataCutoff(new Date("invalid"))).toThrow(
      "INVALID_CUTOFF",
    );
  });
  it("discloses every inclusive overlap with a stable digest", () => {
    const details = buildOverlapDetails(
      [
        {
          reportRunId: "run-b",
          period: { from: "2026-07-20", to: "2026-08-05" },
          status: "succeeded",
        },
        {
          reportRunId: "run-a",
          period: { from: "2026-08-10", to: "2026-08-20" },
          status: "queued",
        },
        {
          reportRunId: "run-c",
          period: { from: "2026-08-20", to: "2026-08-30" },
          status: "failed",
        },
      ],
      period,
    );
    expect(details.overlaps).toEqual([
      {
        reportRunId: "run-b",
        period: { from: "2026-07-20", to: "2026-08-05" },
        intersection: { from: "2026-08-01", to: "2026-08-05" },
      },
      {
        reportRunId: "run-a",
        period: { from: "2026-08-10", to: "2026-08-20" },
        intersection: { from: "2026-08-10", to: "2026-08-20" },
      },
      {
        reportRunId: "run-c",
        period: { from: "2026-08-20", to: "2026-08-30" },
        intersection: { from: "2026-08-20", to: "2026-08-20" },
      },
    ]);
    expect(details.overlapDigest).toMatch(/^[a-f0-9]{64}$/);
  });
  it("creates a fresh cutoff and immutable retry lineage", () => {
    const sourceBeforeRetry = { ...source };
    expect(
      prepareRetryGeneration(
        source,
        new Date("2026-09-22T15:04:05.000Z"),
        materializeGenerationInputsV1(
          validMaterializationInput({
            range: period,
            cutoff: "2026-09-22T15:04:05.000Z",
          }),
        ),
        () => "run-retry",
      ),
    ).toMatchObject({
      reportRunId: "run-retry",
      periodStart: period.from,
      periodEnd: period.to,
      dataCutoffAt: "2026-09-22T15:04:05.000Z",
      retryOfGeneration: { connect: [source.documentId] },
      status: "queued",
    });
    expect(source).toEqual(sourceBeforeRetry);
    expect(() =>
      prepareRetryGeneration(
        { ...source, status: "succeeded" },
        new Date(),
        materializeGenerationInputsV1(validMaterializationInput()),
        () => "run-retry",
      ),
    ).toThrow("INVALID_STATE");
  });
  it("compensates only an untouched queued run through CAS", () => {
    expect(
      prepareDispatchCompensation(
        { status: "queued", stateVersion: 2, taskName: null },
        2,
        "2026-09-22T15:04:05.000Z",
      ),
    ).toEqual({
      status: "failed",
      stateVersion: 3,
      completedAt: "2026-09-22T15:04:05.000Z",
      failureCode: "QUEUE_ENQUEUE_EXHAUSTED",
    });
    expect(() =>
      prepareDispatchCompensation(
        { status: "queued", stateVersion: 2, taskName: "tb113-report-run" },
        2,
        "now",
      ),
    ).toThrow("TASK_ALREADY_CREATED");
  });
  it("requires every checkpoint and valid artifact before atomic completion", () => {
    const artifact = {
      objectKey: "private/report.pdf",
      sha256: "b".repeat(64),
      size: 12,
      mimeType: "application/pdf" as const,
      reportId: "attacker-report",
      generationRunId: "attacker-run",
      dataCutoffAt: "attacker-cutoff",
    };
    const completed = prepareAtomicCompletion({
      generation: { ...source, status: "running", stateVersion: 3 },
      expectedStateVersion: 3,
      reportId: "00000000-0000-4000-8000-000000000002",
      checkpoints: ["redact", "count", "direct", "validate", "render", "store"],
      validatedAnalysis: {
        schemaVersion: "survey-published-analysis.v1",
        sections: [],
      },
      analysisDigest: "c".repeat(64),
      rendererVersion: "renderer.v1",
      artifact,
      now: "2026-09-22T15:04:05.000Z",
    });
    expect(completed.generation).toEqual({
      status: "succeeded",
      stateVersion: 4,
      completedAt: "2026-09-22T15:04:05.000Z",
    });
    expect(completed.report).toMatchObject({
      reportId: "00000000-0000-4000-8000-000000000002",
      generationRunId: source.reportRunId,
      sourceGeneration: { connect: [source.documentId] },
      dataCutoffAt: source.dataCutoffAt,
      analysisContractVersion: "survey-published-analysis.v1",
      analysisDigest: "c".repeat(64),
      rendererVersion: "renderer.v1",
      objectKey: "private/report.pdf",
      artifactSha256: "b".repeat(64),
      artifactSize: 12,
    });
    expect(completed.report.reportId).not.toBe(artifact.reportId);
    expect(completed.report.generationRunId).toBe(source.reportRunId);
    expect(completed.report.dataCutoffAt).toBe(source.dataCutoffAt);
    expect(() =>
      prepareAtomicCompletion({
        generation: { ...source, status: "running", stateVersion: 3 },
        expectedStateVersion: 3,
        reportId: "00000000-0000-4000-8000-000000000002",
        checkpoints: ["redact"],
        artifact: {
          objectKey: "private/report.pdf",
          sha256: "b".repeat(64),
          size: 12,
          mimeType: "application/pdf",
        },
        validatedAnalysis: {
          schemaVersion: "survey-published-analysis.v1",
          sections: [],
        },
        analysisDigest: "c".repeat(64),
        rendererVersion: "renderer.v1",
        now: "now",
      }),
    ).toThrow("CHECKPOINT_SET_INCOMPLETE");
  });
  it("builds the queued command with its cutoff and no synthetic requester", () => {
    const generationData = buildGenerationData(
      {
        contractVersion: "feedback-admin.v1",
        period,
        override: { accepted: false, overlapDigest: null },
      },
      new Date("2026-09-22T15:04:05.000Z"),
      materializeGenerationInputsV1(
        validMaterializationInput({
          range: period,
          cutoff: "2026-09-22T15:04:05.000Z",
        }),
      ),
      () => "00000000-0000-4000-8000-000000000003",
    );
    expect(generationData).toMatchObject({
      reportRunId: "00000000-0000-4000-8000-000000000003",
      dataCutoffAt: "2026-09-22T15:04:05.000Z",
      status: "queued",
    });
    expect(generationData).not.toHaveProperty("requestedBy");
    expect(() =>
      buildGenerationData(
        {
          contractVersion: "feedback-admin.v1",
          period,
          override: { accepted: false, overlapDigest: null },
        },
        new Date("2026-09-22T15:04:05.000Z"),
        undefined as never,
      ),
    ).toThrow("GENERATION_INPUTS_REQUIRED");
  });

  it.each(["range", "cutoff"] as const)(
    "rejects materialized generation inputs with a mismatched snapshot %s",
    (mismatch) => {
      const cutoff = "2026-09-22T15:04:05.000Z";
      const input = materializeGenerationInputsV1(
        validMaterializationInput(
          mismatch === "range"
            ? {
                range: { from: "2026-08-02", to: "2026-08-20" },
                cutoff,
              }
            : {
                range: period,
                cutoff: "2026-09-22T15:04:06.000Z",
              },
        ),
      );

      expect(() =>
        buildGenerationData(
          {
            contractVersion: "feedback-admin.v1",
            period,
            override: { accepted: false, overlapDigest: null },
          },
          new Date(cutoff),
          input,
        ),
      ).toThrow("GENERATION_INPUTS_CONTEXT_MISMATCH");
    },
  );

  it("materializes exact cutoff-bound snapshot and explicit closed worker inputs", () => {
    const snapshotInput = {
      sourceRevision: "source-revision-42",
      createdAt: "2026-08-01T12:01:00.000Z",
      dataCutoffAt: "2026-08-01T12:00:00.000Z",
      range: { from: "2026-08-01", to: "2026-08-01" },
      filters: { pointKey: null, versionKey: null },
      submissions: [
        {
          recordId: "record-current",
          receipt: "receipt-current",
          acceptedAt: "2026-08-01T12:00:00.000Z",
          source: "valid_qr",
          versionKey: "survey-v1",
          pointKey: "summit",
          overallRating: 5,
          commentText: "Current period comment",
          aspects: [],
          locale: "en",
          payloadDigest: "a".repeat(64),
        },
        {
          recordId: "record-previous",
          receipt: "receipt-previous",
          acceptedAt: "2026-08-01T02:00:00.000Z",
          source: "valid_qr",
          versionKey: "survey-v1",
          pointKey: "summit",
          overallRating: 3,
          commentText: "Previous period comment",
          aspects: [],
          locale: "en",
          payloadDigest: "b".repeat(64),
        },
        {
          recordId: "record-after-cutoff",
          receipt: "receipt-after-cutoff",
          acceptedAt: "2026-08-01T12:00:01.000Z",
          source: "valid_qr",
          versionKey: "survey-v1",
          pointKey: "summit",
          overallRating: 1,
          commentText: "Within range but after cutoff",
          aspects: [],
          locale: "en",
          payloadDigest: "c".repeat(64),
        },
      ],
      definitions: [{ aspectKey: "other", sortOrder: 13 }],
      points: [{ pointKey: "summit", displayName: "Summit", sortOrder: 1 }],
    } as const;
    const modelConfig = {
      version: "survey-model-config.v1",
      evidenceKeyId: "evidence-key-2026-01",
      provider: "vertex-ai",
      vertexProjectId: "teleferico-bariloche-2024",
      vertexLocation: "us",
      vertexApiEndpoint: "aiplatform.us.rep.googleapis.com",
      model: "gemini-3.8-flash",
      temperature: 0,
      reasoning: "LOW",
      grounding: false,
      promptVersion: "prompt-v1",
      mapSchemaVersion: "survey-map.v1",
      analysisSchemaVersion: "survey-analysis.v1",
      redactionVersion: "redaction-v1",
      validatorVersion: "validator-v1",
      chunkVersion: "chunk-v1",
      verifiedInputTokenLimit: 10000,
      map: { targetMin: 600, targetMax: 1200, hardMax: 4000 },
      directReduce: { targetMin: 1800, targetMax: 3000, hardMax: 8000 },
      safetyHeadroomTokens: 2048,
      sourceRevision: "source-revision-42",
    } as const;
    const pricingSnapshot = {
      version: "pricing-2026-01",
      currency: "USD",
      units: [
        {
          sku: "model-input",
          inputMicrosPerMillion: 100,
          outputMicrosPerMillion: 200,
        },
      ],
    } as const;
    const input = {
      snapshot: snapshotInput,
      modelConfig,
      pricingSnapshot,
      evidenceKeyId: "evidence-key-2026-01",
    } as const;
    const materialized = materializeGenerationInputsV1(input);

    // Fixed canonical bytes are the digest oracle; do not regenerate this with createSnapshot.
    const expectedCanonicalJson = `{"comments":[{"acceptedAt":"2026-08-01T12:00:00.000Z","aspectRatings":[],"locale":"en","overallRating":5,"period":"current","pointKey":"summit","receipt":"receipt-current","recordId":"record-current","text":"Current period comment","versionKey":"survey-v1"},{"acceptedAt":"2026-08-01T02:00:00.000Z","aspectRatings":[],"locale":"en","overallRating":3,"period":"previous","pointKey":"summit","receipt":"receipt-previous","recordId":"record-previous","text":"Previous period comment","versionKey":"survey-v1"}],"contractVersion":"survey-snapshot.v1","createdAt":"2026-08-01T12:01:00.000Z","metrics":{"aspects":[{"aspectKey":"other","current":{"negative":{"count":0,"rateBps":null},"neutral":{"count":0,"rateBps":null},"positive":{"count":0,"rateBps":null},"total":0},"evidenceThreshold":10,"hasSufficientEvidence":false,"labelVariants":[],"previous":{"negative":{"count":0,"rateBps":null},"neutral":{"count":0,"rateBps":null},"positive":{"count":0,"rateBps":null},"total":0},"relatedOverallRating":[{"averageMilliStars":null,"sentiment":"positive","submissionCount":0},{"averageMilliStars":null,"sentiment":"neutral","submissionCount":0},{"averageMilliStars":null,"sentiment":"negative","submissionCount":0}],"selectionCount":0,"selectionRateBps":0,"sortOrder":13,"trend":[{"from":"2026-08-01","selectionCount":0,"sentiment":{"negative":{"count":0,"rateBps":null},"neutral":{"count":0,"rateBps":null},"positive":{"count":0,"rateBps":null},"total":0},"to":"2026-08-01","unit":"day"},{"from":"2026-08-01","selectionCount":0,"sentiment":{"negative":{"count":0,"rateBps":null},"neutral":{"count":0,"rateBps":null},"positive":{"count":0,"rateBps":null},"total":0},"to":"2026-08-01","unit":"week"},{"from":"2026-08-01","selectionCount":0,"sentiment":{"negative":{"count":0,"rateBps":null},"neutral":{"count":0,"rateBps":null},"positive":{"count":0,"rateBps":null},"total":0},"to":"2026-08-01","unit":"month"}]}],"calendar":[{"from":"2026-08-01","period":"current","satisfactionRateBps":10000,"submissionCount":1,"to":"2026-08-01","unit":"day"},{"from":"2026-08-01","period":"current","satisfactionRateBps":10000,"submissionCount":1,"to":"2026-08-01","unit":"week"},{"from":"2026-08-01","period":"current","satisfactionRateBps":10000,"submissionCount":1,"to":"2026-08-01","unit":"month"},{"from":"2026-07-31","period":"previous","satisfactionRateBps":0,"submissionCount":1,"to":"2026-07-31","unit":"day"},{"from":"2026-07-31","period":"previous","satisfactionRateBps":0,"submissionCount":1,"to":"2026-07-31","unit":"week"},{"from":"2026-07-31","period":"previous","satisfactionRateBps":0,"submissionCount":1,"to":"2026-07-31","unit":"month"}],"classifications":{"opportunities":[],"strengths":[]},"current":{"averageMilliStars":5000,"commentCount":1,"neutral":{"count":0,"rateBps":0},"satisfied":{"count":1,"rateBps":10000},"starDistribution":[{"count":0,"rateBps":0,"star":1},{"count":0,"rateBps":0,"star":2},{"count":0,"rateBps":0,"star":3},{"count":0,"rateBps":0,"star":4},{"count":1,"rateBps":10000,"star":5}],"submissionCount":1,"unfavorable":{"count":0,"rateBps":0}},"deltas":{"averageMilliStars":2000,"commentCount":0,"neutralRateBps":-10000,"satisfiedRateBps":10000,"submissionCount":0,"submissionPercentBps":0,"unfavorableRateBps":0},"fiveStarAssociation":[],"matrix":[{"aspectKey":"other","medianNegativeRateBpsTimesTwo":null,"medianSelectionCountTimesTwo":null,"quadrant":null,"state":"excluded","xSelectionCount":0,"yNegativeRateBps":null}],"otherAspects":[],"previous":{"averageMilliStars":3000,"commentCount":1,"neutral":{"count":1,"rateBps":10000},"satisfied":{"count":0,"rateBps":0},"starDistribution":[{"count":0,"rateBps":0,"star":1},{"count":0,"rateBps":0,"star":2},{"count":1,"rateBps":10000,"star":3},{"count":0,"rateBps":0,"star":4},{"count":0,"rateBps":0,"star":5}],"submissionCount":1,"unfavorable":{"count":0,"rateBps":0}},"qrPoints":[{"current":{"averageMilliStars":5000,"commentCount":1,"neutral":{"count":0,"rateBps":0},"satisfied":{"count":1,"rateBps":10000},"starDistribution":[{"count":0,"rateBps":0,"star":1},{"count":0,"rateBps":0,"star":2},{"count":0,"rateBps":0,"star":3},{"count":0,"rateBps":0,"star":4},{"count":1,"rateBps":10000,"star":5}],"submissionCount":1,"unfavorable":{"count":0,"rateBps":0}},"displayName":"Summit","pointKey":"summit","previous":{"averageMilliStars":3000,"commentCount":1,"neutral":{"count":1,"rateBps":10000},"satisfied":{"count":0,"rateBps":0},"starDistribution":[{"count":0,"rateBps":0,"star":1},{"count":0,"rateBps":0,"star":2},{"count":1,"rateBps":10000,"star":3},{"count":0,"rateBps":0,"star":4},{"count":0,"rateBps":0,"star":5}],"submissionCount":1,"unfavorable":{"count":0,"rateBps":0}},"sortOrder":1}]},"population":{"current":{"from":"2026-08-01","to":"2026-08-01","utcEnd":"2026-08-02T02:59:59.999Z","utcStart":"2026-08-01T03:00:00.000Z"},"currentCommentCount":1,"currentSubmissionCount":1,"dataCutoffAt":"2026-08-01T12:00:00.000Z","excludedAfterCutoffCount":1,"filters":{"pointKey":null,"versionKey":null},"populationDigest":"28fd8c8494108c48d3bbdbf9b5d0401503d1946be1ded90ee7a2003db5091614","previous":{"from":"2026-07-31","to":"2026-07-31","utcEnd":"2026-08-01T02:59:59.999Z","utcStart":"2026-07-31T03:00:00.000Z"},"previousCommentCount":1,"previousSubmissionCount":1,"source":"valid_qr","timeZone":"America/Argentina/Buenos_Aires"},"sourceRevision":"source-revision-42"}`;
    expect(canonicalizeJson(materialized.snapshotJson)).toBe(
      expectedCanonicalJson,
    );
    expect(materialized.snapshotDigest).toBe(sha256(expectedCanonicalJson));
    expect(
      materialized.snapshotJson.comments.map(({ recordId }) => recordId),
    ).toEqual(["record-current", "record-previous"]);
    expect(
      materialized.snapshotJson.comments.map(({ recordId }) => recordId),
    ).not.toContain("record-after-cutoff");
    expect(materialized.snapshotJson.population).toMatchObject({
      dataCutoffAt: "2026-08-01T12:00:00.000Z",
      currentSubmissionCount: 1,
      previousSubmissionCount: 1,
      currentCommentCount: 1,
      previousCommentCount: 1,
      excludedAfterCutoffCount: 1,
    });
    expect(
      materialized.snapshotJson.comments.map(
        ({ recordId, period, acceptedAt }) => ({
          recordId,
          period,
          acceptedAt,
        }),
      ),
    ).toEqual([
      {
        recordId: "record-current",
        period: "current",
        acceptedAt: "2026-08-01T12:00:00.000Z",
      },
      {
        recordId: "record-previous",
        period: "previous",
        acceptedAt: "2026-08-01T02:00:00.000Z",
      },
    ]);
    expect(materialized.sourceRevision).toBe("source-revision-42");
    expect(materialized.modelConfigJson).toEqual(modelConfig);
    expect(materialized.pricingSnapshotJson).toEqual(pricingSnapshot);
    expect(materialized.checkpointsJson).toEqual({
      version: "survey-checkpoints.v1",
      snapshotDigest: sha256(expectedCanonicalJson),
      route: "undecided",
      chunkCount: null,
      entries: [],
    });
    expect(validateMaterializedGenerationInputsV1(materialized)).toBe(
      materialized,
    );
  });

  it("creates a fresh retry snapshot without mutating the prior materialization", () => {
    const originalInput = validMaterializationInput();
    const original = materializeGenerationInputsV1(originalInput);
    const retry = materializeGenerationInputsV1({
      ...originalInput,
      snapshot: {
        ...originalInput.snapshot,
        createdAt: "2026-08-22T00:00:00.000Z",
        dataCutoffAt: "2026-08-22T00:00:00.000Z",
      },
    });

    expect(retry.snapshotDigest).not.toBe(original.snapshotDigest);
    expect(retry.snapshotJson.population.dataCutoffAt).toBe(
      "2026-08-22T00:00:00.000Z",
    );
    expect(original.snapshotJson.population.dataCutoffAt).toBe(
      "2026-08-01T12:00:00.000Z",
    );
    expect(Object.isFrozen(original.snapshotJson)).toBe(true);
    expect(Object.isFrozen(original.checkpointsJson)).toBe(true);
  });

  it.each([
    ["missing snapshot inputs", { snapshot: undefined }],
    ["missing model configuration", { modelConfig: undefined }],
    ["missing pricing snapshot", { pricingSnapshot: undefined }],
    ["missing evidence key identifier", { evidenceKeyId: undefined }],
    [
      "empty pricing units",
      {
        pricingSnapshot: { version: "pricing-v1", currency: "USD", units: [] },
      },
    ],
    [
      "model source revision mismatch",
      { modelConfig: { ...testModelConfig, sourceRevision: "other-revision" } },
    ],
    [
      "evidence key identifier mismatch",
      { modelConfig: { ...testModelConfig, evidenceKeyId: "other-key" } },
    ],
  ])("rejects %s rather than materializing defaults", (_label, replacement) => {
    expect(() =>
      materializeGenerationInputsV1({
        ...validMaterializationInput(),
        ...replacement,
      } as never),
    ).toThrow("INVALID_GENERATION_INPUTS");
  });

  it("rejects placeholder digests and mismatched persisted snapshot/checkpoint data", () => {
    const input = {
      snapshot: {
        sourceRevision: "source-revision-42",
        createdAt: "2026-08-21T00:00:00.000Z",
        dataCutoffAt: "2026-08-21T00:00:00.000Z",
        range: { from: "2026-08-01", to: "2026-08-01" },
        filters: { pointKey: null, versionKey: null },
        submissions: [],
        definitions: [],
        points: [],
      },
      modelConfig: {
        version: "survey-model-config.v1",
        evidenceKeyId: "evidence-key-2026-01",
        provider: "vertex-ai",
        vertexProjectId: "teleferico-bariloche-2024",
        vertexLocation: "us",
        vertexApiEndpoint: "aiplatform.us.rep.googleapis.com",
        model: "gemini-3.8-flash",
        temperature: 0,
        reasoning: "LOW",
        grounding: false,
        promptVersion: "prompt-v1",
        mapSchemaVersion: "survey-map.v1",
        analysisSchemaVersion: "survey-analysis.v1",
        redactionVersion: "redaction-v1",
        validatorVersion: "validator-v1",
        chunkVersion: "chunk-v1",
        verifiedInputTokenLimit: 10000,
        map: { targetMin: 600, targetMax: 1200, hardMax: 4000 },
        directReduce: { targetMin: 1800, targetMax: 3000, hardMax: 8000 },
        safetyHeadroomTokens: 2048,
        sourceRevision: "source-revision-42",
      },
      pricingSnapshot: {
        version: "pricing-2026-01",
        currency: "USD",
        units: [
          {
            sku: "model-input",
            inputMicrosPerMillion: 100,
            outputMicrosPerMillion: 200,
          },
        ],
      },
      evidenceKeyId: "evidence-key-2026-01",
    } as const;
    const materialized = materializeGenerationInputsV1(input);

    expect(() =>
      validateMaterializedGenerationInputsV1({
        ...materialized,
        snapshotDigest: "0".repeat(64),
      }),
    ).toThrow("INVALID_GENERATION_INPUTS");
    expect(() =>
      validateMaterializedGenerationInputsV1({
        ...materialized,
        snapshotJson: {
          ...materialized.snapshotJson,
          sourceRevision: "other-revision",
        },
      }),
    ).toThrow("INVALID_GENERATION_INPUTS");
    expect(() =>
      validateMaterializedGenerationInputsV1({
        ...materialized,
        checkpointsJson: {
          ...materialized.checkpointsJson,
          snapshotDigest: "f".repeat(64),
        },
      }),
    ).toThrow("INVALID_GENERATION_INPUTS");
    expect(() =>
      validateMaterializedGenerationInputsV1({
        ...materialized,
        checkpointsJson: {},
      }),
    ).toThrow("INVALID_GENERATION_INPUTS");
    expect(() =>
      validateMaterializedGenerationInputsV1({
        ...materialized,
        modelConfigJson: {},
      }),
    ).toThrow("INVALID_GENERATION_INPUTS");
  });
});

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}
