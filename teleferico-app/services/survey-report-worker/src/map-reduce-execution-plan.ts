import { createHash } from "node:crypto";

import { canonicalizeJson, type SnapshotV1 } from "../../../packages/survey-reporting-core/src";
import { deriveChunkMembership, deriveEvidenceRef } from "./checkpoint-contract";
import { createDirectCountRequestV1, createDirectModelRequestV1, redactCommentTextV1 } from "./direct-execution-plan";
import type {
  CountCheckpointPayload,
  CountTokensProvider,
  CountTokensRequestV1,
  CountTokensResultV1,
  MapModelRequestV1,
  ModelConfigV1,
} from "./contracts";

const MAP_INSTRUCTIONS =
  "Extract descriptive evidence and themes only from this complete comment chunk. Return the exact closed survey-map.v1 schema, cite only supplied opaque evidence refs, and do not calculate official metrics, recommend actions, claim causality, or reproduce comments. Semantic truth is not machine-verified.";

const MAP_SCHEMA = canonicalizeJson({
  schemaVersion: "survey-map.v1",
  chunkId: "map.<index>-of-<count>",
  coveredRefs: ["e_<20-lowercase-base32-characters>"],
  themes: [{
    themeKey: "lowercase-stable-id",
    labelEs: "Spanish descriptive label",
    claims: [{
      claimId: "lowercase-stable-id",
      textEs: "Spanish descriptive text",
      evidenceRefs: ["e_<20-lowercase-base32-characters>"],
      signal: { enum: ["recurrent", "minority", "descriptive"] },
    }],
  }],
  limitations: ["Spanish descriptive limitation"],
});

const REDUCE_INSTRUCTIONS =
  "Combine only the validated map outputs and immutable official metrics supplied. Return the exact seven-section survey-analysis.v1 reduce schema. Do not calculate or alter metrics, invent evidence refs, recommend actions, claim causality, or reproduce comments. Semantic truth is not machine-verified.";

const REDUCE_SCHEMA = canonicalizeJson({
  schemaVersion: "survey-analysis.v1",
  route: "reduce",
  sections: [{
    key: { enum: ["executive_summary", "observed_changes", "strengths", "unfavorable_areas", "recurrent_themes", "minority_signals", "coverage_limitations"] },
    status: { enum: ["supported", "insufficient_evidence"] },
    claims: [{
      claimId: "lowercase-stable-id",
      textEs: "Spanish descriptive text",
      evidenceRefs: ["e_<20-lowercase-base32-characters>"],
      signal: { enum: ["recurrent", "minority", "descriptive"] },
    }],
  }],
  mapOutputDigests: ["sha256"],
});

type CountEvidence = {
  readonly requestDigest: string;
  readonly segmentTokens: CountTokensResultV1 & {
    readonly reservedOutput: number;
    readonly headroom: number;
  };
  readonly totalTokens: number;
};

export type MapReducePlanV1 = {
  readonly route: "map-reduce";
  readonly chunkCount: number;
  readonly chunks: readonly {
    readonly membership: ReturnType<typeof deriveChunkMembership>[number];
    readonly request: MapModelRequestV1;
  }[];
  readonly checkpoint: CountCheckpointPayload;
};

export type WorkerRoutePlanV1 =
  | { readonly route: "direct"; readonly checkpoint: CountCheckpointPayload }
  | MapReducePlanV1;

function validCountTokens(value: unknown): value is CountTokensResultV1 {
  const keys = ["instructions", "schema", "metrics", "comments"] as const;
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return Object.keys(record).length === keys.length && keys.every((key) =>
    Object.hasOwn(record, key) && Number.isSafeInteger(record[key]) && Number(record[key]) >= 0,
  );
}

function countRequestTokens(input: {
  readonly request: CountTokensRequestV1;
  readonly result: CountTokensResultV1;
  readonly modelConfig: ModelConfigV1;
  readonly reservedOutput: number;
}): CountEvidence {
  const headroom = Math.max(
    2_048,
    Math.ceil(input.modelConfig.verifiedInputTokenLimit * 0.1),
  );
  const segmentTokens = {
    ...input.result,
    reservedOutput: input.reservedOutput,
    headroom,
  };
  const totalTokens = Object.values(segmentTokens).reduce((sum, value) => sum + value, 0);
  if (!Number.isSafeInteger(totalTokens)) throw new TypeError("CountTokens total is invalid");
  return {
    requestDigest: createHash("sha256").update(canonicalizeJson(input.request), "utf8").digest("hex"),
    segmentTokens,
    totalTokens,
  };
}

function chunkRequest(input: {
  readonly snapshot: SnapshotV1;
  readonly modelConfig: ModelConfigV1;
  readonly reportRunId: string;
  readonly snapshotDigest: string;
  readonly evidenceKey: string | Uint8Array;
  readonly chunkCount: number;
  readonly chunkIndex: number;
}): { readonly request: CountTokensRequestV1; readonly modelRequest: MapModelRequestV1 } {
  const membership = deriveChunkMembership({
    reportRunId: input.reportRunId,
    snapshotDigest: input.snapshotDigest,
    evidenceKeyId: input.modelConfig.evidenceKeyId,
    evidenceKey: input.evidenceKey,
    chunkCount: input.chunkCount,
    comments: input.snapshot.comments,
  })[input.chunkIndex - 1];
  if (!membership) throw new TypeError("Map chunk membership is unavailable");
  const refs = new Set(membership.coveredRefs);
  const recordRefs = new Map(input.snapshot.comments.map((comment) => [
    comment.recordId,
    deriveEvidenceRef({
      reportRunId: input.reportRunId,
      recordId: comment.recordId,
      evidenceKey: input.evidenceKey,
    }),
  ]));
  const memberRecords = new Set(input.snapshot.comments
    .filter((comment) => refs.has(recordRefs.get(comment.recordId) ?? ""))
    .map(({ recordId }) => recordId));
  const projectedComments = input.snapshot.comments
    .filter(({ recordId }) => memberRecords.has(recordId))
    .map((comment) => ({
      period: comment.period,
      text: redactCommentTextV1(comment.text),
      evidenceRef: recordRefs.get(comment.recordId) ?? "",
    }));
  const chunkId = `map.${input.chunkIndex}-of-${input.chunkCount}`;
  const modelRequest: MapModelRequestV1 = {
    contractVersion: "survey-map-input.v1",
    chunkId,
    chunkIndex: input.chunkIndex,
    chunkCount: input.chunkCount,
    metrics: input.snapshot.metrics,
    comments: projectedComments,
  };
  const request: CountTokensRequestV1 = {
    contractVersion: "survey-count-request.v1",
    modelConfig: input.modelConfig,
    segments: {
      instructions: MAP_INSTRUCTIONS,
      schema: MAP_SCHEMA,
      metrics: canonicalizeJson(input.snapshot.metrics),
      comments: canonicalizeJson(modelRequest),
    },
  };
  return { request, modelRequest };
}

export function buildMapChunksV1(input: {
  readonly snapshot: SnapshotV1;
  readonly snapshotDigest: string;
  readonly reportRunId: string;
  readonly evidenceKey: string | Uint8Array;
  readonly modelConfig: ModelConfigV1;
  readonly chunkCount: number;
}): readonly {
  readonly membership: ReturnType<typeof deriveChunkMembership>[number];
  readonly request: MapModelRequestV1;
  readonly countRequest: CountTokensRequestV1;
}[] {
  const memberships = deriveChunkMembership({
    reportRunId: input.reportRunId,
    snapshotDigest: input.snapshotDigest,
    evidenceKeyId: input.modelConfig.evidenceKeyId,
    evidenceKey: input.evidenceKey,
    chunkCount: input.chunkCount,
    comments: input.snapshot.comments,
  });
  return memberships.map((membership) => {
    const built = chunkRequest({ ...input, chunkIndex: membership.chunkIndex });
    return { membership, request: built.modelRequest, countRequest: built.request };
  });
}

export async function countGeneratedOutputV1(input: {
  readonly output: unknown;
  readonly modelConfig: ModelConfigV1;
  readonly countTokens: CountTokensProvider;
  readonly stage: "map" | "reduce";
}): Promise<{ readonly tokenCount: number; readonly requestDigest: string }> {
  const request: CountTokensRequestV1 = {
    contractVersion: "survey-count-request.v1",
    modelConfig: input.modelConfig,
    segments: {
      instructions: input.stage === "map" ? MAP_INSTRUCTIONS : REDUCE_INSTRUCTIONS,
      schema: input.stage === "map" ? MAP_SCHEMA : REDUCE_SCHEMA,
      metrics: "{}",
      comments: canonicalizeJson(input.output),
    },
  };
  const result = await input.countTokens(request);
  if (!validCountTokens(result)) throw new TypeError("CountTokens returned an invalid output result");
  return {
    tokenCount: result.comments,
    requestDigest: createHash("sha256").update(canonicalizeJson(request), "utf8").digest("hex"),
  };
}

export async function planMapReduceExecutionV1(input: {
  readonly snapshot: SnapshotV1;
  readonly snapshotDigest: string;
  readonly reportRunId: string;
  readonly evidenceKey: string | Uint8Array;
  readonly modelConfig: ModelConfigV1;
  readonly countTokens: CountTokensProvider;
  readonly directEvidence?: CountEvidence;
}): Promise<MapReducePlanV1> {
  let directEvidence = input.directEvidence;
  if (!directEvidence) {
    const directRequest = createDirectCountRequestV1({
      snapshot: input.snapshot,
      modelInput: createDirectModelRequestV1({
        snapshot: input.snapshot,
        reportRunId: input.reportRunId,
        evidenceKey: input.evidenceKey,
      }),
      modelConfig: input.modelConfig,
    });
    const directResult = await input.countTokens(directRequest);
    if (!validCountTokens(directResult)) throw new TypeError("CountTokens returned an invalid result");
    directEvidence = countRequestTokens({
      request: directRequest,
      result: directResult,
      modelConfig: input.modelConfig,
      reservedOutput: input.modelConfig.directReduce.targetMax,
    });
  }
  if (directEvidence.totalTokens <= input.modelConfig.verifiedInputTokenLimit)
    throw Object.assign(new TypeError("Direct request fits; map-reduce routing is not authorized"), { code: "INVARIANT" as const });

  const attempts: { readonly chunkCount: number; readonly chunks: readonly CountEvidence[] }[] = [];
  for (let chunkCount = 1; chunkCount <= input.snapshot.comments.length; chunkCount += 1) {
    const plannedChunks = buildMapChunksV1({ ...input, chunkCount });
    const counted = [] as CountEvidence[];
    for (const { countRequest } of plannedChunks) {
      const result = await input.countTokens(countRequest);
      if (!validCountTokens(result)) throw new TypeError("CountTokens returned an invalid result");
      counted.push(countRequestTokens({
        request: countRequest,
        result,
        modelConfig: input.modelConfig,
        reservedOutput: input.modelConfig.map.targetMax,
      }));
    }
    attempts.push({ chunkCount, chunks: counted });
    if (counted.every(({ totalTokens }) => totalTokens <= input.modelConfig.verifiedInputTokenLimit)) {
      return {
        route: "map-reduce",
        chunkCount,
        chunks: plannedChunks.map(({ membership, request }) => ({ membership, request })),
        checkpoint: {
          kind: "count",
          requestDigest: directEvidence.requestDigest,
          segmentTokens: directEvidence.segmentTokens,
          totalTokens: directEvidence.totalTokens,
          route: "map-reduce",
          directRequestDigest: directEvidence.requestDigest,
          directSegmentTokens: directEvidence.segmentTokens,
          directTotalTokens: directEvidence.totalTokens,
          attempts,
          chunkCount,
        },
      };
    }
  }
  throw Object.assign(new TypeError("No complete-record map chunk plan fits the verified token limit"), {
    code: "UNKNOWN_VERSION" as const,
  });
}

export async function planWorkerRouteV1(input: {
  readonly snapshot: SnapshotV1;
  readonly snapshotDigest: string;
  readonly reportRunId: string;
  readonly evidenceKey: string | Uint8Array;
  readonly modelConfig: ModelConfigV1;
  readonly countTokens: CountTokensProvider;
}): Promise<WorkerRoutePlanV1> {
  const directRequest = createDirectCountRequestV1({
    snapshot: input.snapshot,
    modelInput: createDirectModelRequestV1({
      snapshot: input.snapshot,
      reportRunId: input.reportRunId,
      evidenceKey: input.evidenceKey,
    }),
    modelConfig: input.modelConfig,
  });
  const directResult = await input.countTokens(directRequest);
  if (!validCountTokens(directResult)) throw new TypeError("CountTokens returned an invalid result");
  const directEvidence = countRequestTokens({
    request: directRequest,
    result: directResult,
    modelConfig: input.modelConfig,
    reservedOutput: input.modelConfig.directReduce.targetMax,
  });
  if (directEvidence.totalTokens <= input.modelConfig.verifiedInputTokenLimit)
    return {
      route: "direct",
      checkpoint: {
        kind: "count",
        requestDigest: directEvidence.requestDigest,
        segmentTokens: directEvidence.segmentTokens,
        totalTokens: directEvidence.totalTokens,
      },
    };
  return planMapReduceExecutionV1({ ...input, directEvidence });
}
