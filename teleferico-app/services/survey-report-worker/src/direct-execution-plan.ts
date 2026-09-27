import { createHash } from "node:crypto";

import { canonicalizeJson, type SnapshotV1 } from "../../../packages/survey-reporting-core/src";
import type {
  CountCheckpointPayload,
  CountTokensRequestV1,
  CountTokensResultV1,
  DirectAnalysisV1,
  ModelConfigV1,
  PublishedAnalysisV1,
} from "./contracts";

export const EMPTY_EVIDENCE_PARAGRAPH =
  "No hay comentarios elegibles para respaldar esta sección en el período analizado.";

const SECTION_KEYS = [
  "executive_summary",
  "observed_changes",
  "strengths",
  "unfavorable_areas",
  "recurrent_themes",
  "minority_signals",
  "coverage_limitations",
] as const;

const DIRECT_INSTRUCTIONS =
  "Describe only evidence supported by the supplied snapshot. Do not infer when there are no eligible comments.";

const DIRECT_SCHEMA = canonicalizeJson({
  schemaVersion: "survey-analysis.v1",
  route: "direct",
  sections: SECTION_KEYS.map((key) => ({ key, status: "insufficient_evidence", claims: [] })),
});

export function createEmptyEvidenceDirectAnalysisV1(): DirectAnalysisV1 {
  return {
    schemaVersion: "survey-analysis.v1",
    route: "direct",
    sections: SECTION_KEYS.map((key) => ({
      key,
      status: "insufficient_evidence",
      claims: [],
    })) as unknown as DirectAnalysisV1["sections"],
  };
}

export function publishEmptyEvidenceAnalysisV1(
  snapshot: SnapshotV1,
  direct: DirectAnalysisV1,
): PublishedAnalysisV1 {
  if (snapshot.comments.length !== 0) {
    throw new TypeError("Unsupported semantic analysis input");
  }
  const expected = createEmptyEvidenceDirectAnalysisV1();
  if (canonicalizeJson(direct) !== canonicalizeJson(expected)) {
    throw new TypeError("Direct analysis did not match the empty-evidence contract");
  }
  return {
    schemaVersion: "survey-published-analysis.v1",
    sections: SECTION_KEYS.map((key) => ({
      key,
      status: "insufficient_evidence",
      paragraphsEs: [EMPTY_EVIDENCE_PARAGRAPH],
    })) as unknown as PublishedAnalysisV1["sections"],
  };
}

export function isEmptyEvidenceDirectAnalysisV1(value: unknown): value is DirectAnalysisV1 {
  try {
    return canonicalizeJson(value) === canonicalizeJson(createEmptyEvidenceDirectAnalysisV1());
  } catch {
    return false;
  }
}

export function isEmptyEvidencePublishedAnalysisV1(
  value: unknown,
  snapshot?: SnapshotV1,
): value is PublishedAnalysisV1 {
  if (snapshot && snapshot.comments.length !== 0) return false;
  try {
    const expected: PublishedAnalysisV1 = {
      schemaVersion: "survey-published-analysis.v1",
      sections: SECTION_KEYS.map((key) => ({
        key,
        status: "insufficient_evidence",
        paragraphsEs: [EMPTY_EVIDENCE_PARAGRAPH],
      })) as unknown as PublishedAnalysisV1["sections"],
    };
    return canonicalizeJson(value) === canonicalizeJson(expected);
  } catch {
    return false;
  }
}

function validCount(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

export async function planDirectExecutionV1(input: {
  readonly snapshot: SnapshotV1;
  readonly modelConfig: ModelConfigV1;
  readonly countTokens: (request: CountTokensRequestV1) => Promise<CountTokensResultV1>;
}): Promise<{ readonly route: "direct"; readonly checkpoint: CountCheckpointPayload }> {
  if (input.snapshot.comments.length !== 0) {
    throw Object.assign(
      new TypeError("Semantic analysis is unavailable for this local provider"),
      { code: "UNKNOWN_VERSION" as const },
    );
  }

  const request: CountTokensRequestV1 = {
    contractVersion: "survey-count-request.v1",
    modelConfig: input.modelConfig,
    segments: {
      instructions: DIRECT_INSTRUCTIONS,
      schema: DIRECT_SCHEMA,
      metrics: canonicalizeJson(input.snapshot.metrics),
      comments: canonicalizeJson(input.snapshot.comments),
    },
  };
  const counted = await input.countTokens(request);
  const keys = ["instructions", "schema", "metrics", "comments"] as const;
  if (
    !counted ||
    Object.keys(counted).length !== keys.length ||
    !keys.every((key) => Object.hasOwn(counted, key) && validCount(counted[key]))
  ) {
    throw new TypeError("CountTokens returned an invalid result");
  }

  const headroom = Math.max(
    2_048,
    Math.ceil(input.modelConfig.verifiedInputTokenLimit * 0.1),
  );
  const segmentTokens = {
    ...counted,
    reservedOutput: input.modelConfig.directReduce.targetMax,
    headroom,
  };
  const totalTokens = Object.values(segmentTokens).reduce((sum, value) => sum + value, 0);
  if (
    !Number.isSafeInteger(totalTokens) ||
    totalTokens > input.modelConfig.verifiedInputTokenLimit
  ) {
    throw Object.assign(
      new TypeError("Direct route does not fit the verified input token limit"),
      { code: "UNKNOWN_VERSION" as const },
    );
  }

  const requestDigest = createHash("sha256").update(canonicalizeJson(request), "utf8").digest("hex");
  return {
    route: "direct",
    checkpoint: { kind: "count", requestDigest, segmentTokens, totalTokens },
  };
}
