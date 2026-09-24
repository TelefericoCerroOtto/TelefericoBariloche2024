// @vitest-environment node

import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  createSnapshot,
  canonicalizeJson,
  type SnapshotEnvelopeV1,
} from "../../../packages/survey-reporting-core/src";
import { deriveEvidenceRef } from "../../../services/survey-report-worker/src/checkpoint-contract";
import { preflightDirectAnalysis } from "../../../services/survey-report-worker/src/analysis-output-preflight";
import { PUBLISHED_SECTION_KEYS } from "../../../services/survey-report-worker/src/contracts";

const RUN_ID = "00000000-0000-4000-8000-000000000113";
const KEY = "synthetic-only-test-key-that-is-not-a-secret";
const KEY_ID = "synthetic-test-key-v1";

function inputSnapshot(
  texts: readonly string[] = Array.from(
    { length: 10 },
    (_, i) => `synthetic comment ${i} unrelated words`,
  ),
) {
  const empty = createSnapshot({
    sourceRevision: "synthetic-test-source",
    createdAt: "2026-09-24T12:00:00.000Z",
    dataCutoffAt: "2026-09-24T11:59:59.000Z",
    range: { from: "2026-09-01", to: "2026-09-01" },
    filters: { pointKey: null, versionKey: null },
    submissions: [],
    definitions: [{ aspectKey: "other", sortOrder: 99 }],
    points: [],
  });
  const comments = texts.map((text, index) => ({
    recordId: `synthetic-${index}`,
    receipt: `receipt-${index}`,
    period: "current" as const,
    acceptedAt: `2026-09-24T10:${String(index).padStart(2, "0")}:00.000Z`,
    locale: "es" as const,
    versionKey: "synthetic-v1",
    pointKey: "synthetic-point",
    overallRating: 5 as const,
    aspectRatings: [],
    text,
  }));
  const payload = { ...empty.payload, comments };
  return {
    canonicalization: "tb-json.v1" as const,
    algorithm: "sha256" as const,
    digestHex: createHash("sha256")
      .update(canonicalizeJson(payload))
      .digest("hex"),
    payload,
  } satisfies SnapshotEnvelopeV1;
}

function directOutput(claims: readonly unknown[] = []) {
  return {
    schemaVersion: "survey-analysis.v1",
    route: "direct",
    sections: PUBLISHED_SECTION_KEYS.map((key, index) => ({
      key,
      status:
        index === 0 && claims.length ? "supported" : "insufficient_evidence",
      claims: index === 0 ? claims : [],
    })),
  };
}

function claim(
  refs: readonly string[],
  overrides: Record<string, unknown> = {},
) {
  return {
    claimId: "claim-a",
    textEs: "Observación sintética sin recomendación.",
    evidenceRefs: refs,
    signal: "recurrent",
    ...overrides,
  };
}

function evaluate(output: unknown, snapshot = inputSnapshot()) {
  return preflightDirectAnalysis(output, {
    snapshot,
    reportRunId: RUN_ID,
    evidenceKeyId: KEY_ID,
    evidenceKey: KEY,
  });
}

describe("direct worker output preflight", () => {
  const snapshot = inputSnapshot();
  const refs = snapshot.payload.comments.map(({ recordId }) =>
    deriveEvidenceRef({ reportRunId: RUN_ID, recordId, evidenceKey: KEY }),
  );

  it("reports only the independently checked subset and never calls an object validated", () => {
    const result = evaluate(directOutput([claim(refs)]), snapshot);
    expect(result.status).toBe("incomplete");
    if (result.status !== "incomplete")
      throw new Error("expected incomplete inspection");
    expect(result.blockers).toContain(
      "exact_claim_to_metric_grounding_and_contradiction_analysis",
    );
    expect(result.blockers).toContain(
      "immutable_per_run_evidence_key_selection",
    );
    expect(JSON.stringify(result)).not.toContain("synthetic comment");
  });

  it("rejects unknown keys and section-order drift", () => {
    expect(
      evaluate({ ...directOutput(), extra: true }, snapshot),
    ).toMatchObject({
      status: "rejected",
      violations: ["invalid_output_contract"],
    });
    expect(
      evaluate(
        { ...directOutput(), sections: [...directOutput().sections].reverse() },
        snapshot,
      ),
    ).toMatchObject({ status: "rejected" });
    expect(
      evaluate(directOutput([{ ...claim(refs), extra: "private" }]), snapshot),
    ).toMatchObject({ status: "rejected" });
  });

  it("rejects absent, malformed, duplicate, and foreign refs", () => {
    for (const refsUnderTest of [
      [],
      ["not-a-ref"],
      [refs[0], refs[0]],
      ["e_aaaaaaaaaaaaaaaaaaaa"],
    ]) {
      const result = evaluate(directOutput([claim(refsUnderTest)]), snapshot);
      expect(result.status).toBe("rejected");
    }
    const missing = evaluate(directOutput([claim(refs.slice(0, 9))]), snapshot);
    expect(missing).toMatchObject({ status: "rejected" });
  });

  it("enforces minority and recurrent thresholds from snapshot comment counts", () => {
    expect(
      evaluate(directOutput([claim(refs.slice(0, 9))]), snapshot),
    ).toMatchObject({ status: "rejected" });
    expect(
      evaluate(
        directOutput([claim(refs.slice(0, 3), { signal: "minority" })]),
        snapshot,
      ),
    ).toMatchObject({ status: "rejected" });
    expect(
      evaluate(
        directOutput([claim(refs.slice(0, 4), { signal: "minority" })]),
        snapshot,
      ).status,
    ).toBe("incomplete");
  });

  it("rejects action language and short or eight-token verbatim comment matches", () => {
    expect(
      evaluate(
        directOutput([
          claim(refs, { textEs: "Recomendamos cambiar el acceso." }),
        ]),
        snapshot,
      ),
    ).toMatchObject({ status: "rejected" });
    const privateSnapshot = inputSnapshot([
      "este comentario sintético contiene ocho palabras únicas solo para prueba",
    ]);
    const privateRef = deriveEvidenceRef({
      reportRunId: RUN_ID,
      recordId: "synthetic-0",
      evidenceKey: KEY,
    });
    expect(
      evaluate(
        directOutput([
          claim([privateRef], {
            signal: "descriptive",
            textEs: "Comentario sintético breve",
          }),
        ]),
        inputSnapshot(["Comentario sintético breve"]),
      ),
    ).toMatchObject({ status: "rejected" });
    expect(
      evaluate(
        directOutput([
          claim([privateRef], {
            signal: "descriptive",
            textEs:
              "este comentario sintético contiene ocho palabras únicas solo para prueba",
          }),
        ]),
        privateSnapshot,
      ),
    ).toMatchObject({ status: "rejected" });
  });

  it("rejects malformed Unicode and duplicate claim IDs while leaving semantic contradiction blocked", () => {
    expect(
      evaluate(
        directOutput([claim(refs, { textEs: "invalid \uD800 text" })]),
        snapshot,
      ),
    ).toMatchObject({ status: "rejected" });
    const duplicated = directOutput([claim(refs)]);
    duplicated.sections[1]!.status = "supported";
    duplicated.sections[1]!.claims = [claim(refs)];
    const result = evaluate(duplicated, snapshot);
    expect(result).toMatchObject({ status: "rejected" });

    const contradictory = directOutput([
      claim(refs, { textEs: "La experiencia se describe como positiva." }),
      claim(refs, {
        claimId: "claim-b",
        textEs: "La experiencia se describe como negativa.",
      }),
    ]);
    const unresolved = evaluate(contradictory, snapshot);
    expect(unresolved.status).toBe("incomplete");
    if (unresolved.status !== "incomplete")
      throw new Error("expected incomplete inspection");
    expect(unresolved.blockers).toContain(
      "exact_claim_to_metric_grounding_and_contradiction_analysis",
    );
  });
});
