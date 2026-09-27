// @vitest-environment node

import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  createSnapshot,
  canonicalizeJson,
  type SnapshotEnvelopeV1,
} from "../../../packages/survey-reporting-core/src";
import {
  deriveChunkMembership,
  deriveEvidenceRef,
} from "../../../services/survey-report-worker/src/checkpoint-contract";
import {
  preflightDirectAnalysis,
  preflightMapAnalysis,
  preflightReduceAnalysis,
} from "../../../services/survey-report-worker/src/analysis-output-preflight";
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

function mapOutput(
  membership: ReturnType<typeof deriveChunkMembership>[number],
  overrides: Record<string, unknown> = {},
) {
  return {
    schemaVersion: "survey-map.v1",
    chunkId: `map.${membership.chunkIndex}-of-${membership.chunkCount}`,
    coveredRefs: membership.coveredRefs,
    themes: [],
    limitations: [],
    ...overrides,
  };
}

function reduceOutput(
  mapOutputDigests: readonly string[],
  overrides: Record<string, unknown> = {},
) {
  return {
    schemaVersion: "survey-analysis.v1",
    route: "reduce",
    sections: PUBLISHED_SECTION_KEYS.map((key) => ({
      key,
      status: "insufficient_evidence",
      claims: [],
    })),
    mapOutputDigests,
    ...overrides,
  };
}

function mapInput(snapshot = inputSnapshot(), chunkCount = 2) {
  return {
    snapshot,
    reportRunId: RUN_ID,
    evidenceKeyId: KEY_ID,
    evidenceKey: KEY,
    chunkCount,
  };
}

describe("direct worker output preflight", () => {
  const snapshot = inputSnapshot();
  const refs = snapshot.payload.comments.map(({ recordId }) =>
    deriveEvidenceRef({ reportRunId: RUN_ID, recordId, evidenceKey: KEY }),
  );

  it("accepts structurally safe direct narratives without claiming semantic truth", () => {
    const result = evaluate(directOutput([claim(refs)]), snapshot);
    expect(result.status).toBe("accepted");
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
    ).toBe("accepted");
  });

  it("rejects a signal that contradicts its recurrent or minority section", () => {
    const recurrent = directOutput();
    recurrent.sections[4]!.status = "supported";
    recurrent.sections[4]!.claims = [claim(refs, { signal: "descriptive" })];
    expect(evaluate(recurrent, snapshot)).toMatchObject({
      status: "rejected",
      violations: ["section_signal_mismatch"],
    });

    const minority = directOutput();
    minority.sections[5]!.status = "supported";
    minority.sections[5]!.claims = [claim(refs, { signal: "recurrent" })];
    expect(evaluate(minority, snapshot)).toMatchObject({
      status: "rejected",
      violations: ["section_signal_mismatch"],
    });
  });

  it("rejects numeric values absent from the immutable metrics snapshot", () => {
    const result = evaluate(
      directOutput([
        claim(refs, {
          textEs: "La satisfacción pasó de 20 % a 10 % en el período actual.",
        }),
      ]),
      snapshot,
    );

    expect(result).toMatchObject({
      status: "rejected",
      violations: ["unsupported_official_metric_value"],
    });
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
    expect(
      evaluate(
        directOutput([claim(refs, { textEs: "Contacto visitor@example.invalid disponible." })]),
        snapshot,
      ),
    ).toMatchObject({ status: "rejected", violations: ["personal_data_or_url"] });
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
    expect(unresolved.status).toBe("accepted");
  });
});

describe("map/reduce worker output preflight", () => {
  const snapshot = inputSnapshot();
  const memberships = deriveChunkMembership({
    ...mapInput(snapshot),
    snapshotDigest: snapshot.digestHex,
    comments: snapshot.payload.comments,
  });
  const mapDigests = ["a".repeat(64), "b".repeat(64)];

  it("derives map membership and leaves valid MapV1 output incomplete", () => {
    const result = preflightMapAnalysis(mapOutput(memberships[0]!), {
      ...mapInput(snapshot),
    });

    expect(result.status).toBe("incomplete");
    if (result.status !== "incomplete")
      throw new Error("expected incomplete map inspection");
    expect(result.checked).toContain("derived_map_chunk_membership");
    expect(result.blockers).toContain("count_tokens_chunk_selection_authority");
    expect(JSON.stringify(result)).not.toContain("synthetic comment");
  });

  it("rejects missing, extra, duplicate, reordered, or foreign map refs", () => {
    const expected = memberships[0]!.coveredRefs;
    const mutations = [
      expected.slice(1),
      [...expected, memberships[1]!.coveredRefs[0]],
      [...expected, expected[0]],
      [...expected].reverse(),
      ["e_aaaaaaaaaaaaaaaaaaaa"],
    ];

    for (const coveredRefs of mutations) {
      expect(
        preflightMapAnalysis(mapOutput(memberships[0]!, { coveredRefs }), {
          ...mapInput(snapshot),
        }).status,
      ).toBe("rejected");
    }
    expect(
      preflightMapAnalysis(
        mapOutput(memberships[0]!, { chunkId: "map.2-of-2" }),
        { ...mapInput(snapshot) },
      ).status,
    ).toBe("rejected");
  });

  it("rejects unknown map fields, unsupported versions, and unsorted theme or claim IDs", () => {
    const validClaim = {
      claimId: "claim-a",
      textEs: "Observación sintética.",
      evidenceRefs: memberships[0]!.coveredRefs,
      signal: "descriptive",
    };
    const theme = (themeKey: string, claims: readonly unknown[] = []) => ({
      themeKey,
      labelEs: "Tema sintético",
      claims,
    });

    for (const output of [
      mapOutput(memberships[0]!, { extra: true }),
      mapOutput(memberships[0]!, { schemaVersion: "survey-map.v2" }),
      mapOutput(memberships[0]!, {
        themes: [theme("theme-b"), theme("theme-a")],
      }),
      mapOutput(memberships[0]!, {
        themes: [
          theme("theme-a", [{ ...validClaim, claimId: "claim-b" }, validClaim]),
        ],
      }),
    ]) {
      expect(
        preflightMapAnalysis(output, { ...mapInput(snapshot) }).status,
      ).toBe("rejected");
    }
  });

  it("rejects prohibited or verbatim map content", () => {
    const privateSnapshot = inputSnapshot([
      "este comentario sintético contiene ocho palabras únicas solo para prueba",
    ]);
    const membership = deriveChunkMembership({
      ...mapInput(privateSnapshot, 1),
      snapshotDigest: privateSnapshot.digestHex,
      comments: privateSnapshot.payload.comments,
    })[0]!;

    expect(
      preflightMapAnalysis(
        mapOutput(membership, {
          limitations: ["Recomendamos mejorar el acceso."],
        }),
        { ...mapInput(privateSnapshot, 1) },
      ),
    ).toMatchObject({ status: "rejected" });
    expect(
      preflightMapAnalysis(
        mapOutput(membership, {
          themes: [
            {
              themeKey: "theme-a",
              labelEs: "Tema sintético",
              claims: [
                {
                  claimId: "claim-a",
                  textEs:
                    "este comentario sintético contiene ocho palabras únicas solo para prueba",
                  evidenceRefs: membership.coveredRefs,
                  signal: "descriptive",
                },
              ],
            },
          ],
        }),
        { ...mapInput(privateSnapshot, 1) },
      ),
    ).toMatchObject({ status: "rejected" });
  });

  it("rejects malformed or duplicate reduce digests and leaves order incomplete", () => {
    const input = {
      snapshot,
      reportRunId: RUN_ID,
      evidenceKeyId: KEY_ID,
      evidenceKey: KEY,
    };

    const result = preflightReduceAnalysis(reduceOutput(mapDigests), input);
    expect(result.status).toBe("incomplete");
    if (result.status !== "incomplete")
      throw new Error("expected incomplete reduce inspection");
    expect(result.checked).toContain("map_output_digest_syntax_and_uniqueness");
    expect(result.checked).not.toContain(
      "ordered_validated_map_output_digests",
    );
    expect(result.blockers).toContain(
      "independently_verified_cms_map_checkpoint_output_digests",
    );
    expect(result.blockers).toContain("map_semantic_and_metric_validation");

    for (const digests of [
      [],
      [mapDigests[0], mapDigests[0]],
      ["not-a-digest", mapDigests[1]],
    ]) {
      expect(preflightReduceAnalysis(reduceOutput(digests), input).status).toBe(
        "rejected",
      );
    }
    expect(
      preflightReduceAnalysis(reduceOutput([...mapDigests].reverse()), input),
    ).toMatchObject({ status: "incomplete" });
  });

  it("does not treat matching forged caller-supplied map digests as CMS-verified", () => {
    const forgedDigests = ["d".repeat(64), "e".repeat(64)];
    const input = {
      snapshot,
      reportRunId: RUN_ID,
      evidenceKeyId: KEY_ID,
      evidenceKey: KEY,
      validatedMapOutputs: forgedDigests.map((outputDigest, index) => ({
        chunkIndex: index + 1,
        outputDigest,
      })),
    };

    const result = preflightReduceAnalysis(reduceOutput(forgedDigests), input);
    expect(result.status).toBe("incomplete");
    if (result.status !== "incomplete")
      throw new Error("expected incomplete reduce inspection");
    expect(result.checked).not.toContain(
      "ordered_validated_map_output_digests",
    );
    expect(result.blockers).toContain(
      "independently_verified_cms_map_checkpoint_output_digests",
    );
  });

  it("rejects unsupported reduce versions, unknown keys, and out-of-order sections", () => {
    const input = {
      snapshot,
      reportRunId: RUN_ID,
      evidenceKeyId: KEY_ID,
      evidenceKey: KEY,
    };

    for (const output of [
      reduceOutput(mapDigests, { schemaVersion: "survey-analysis.v2" }),
      reduceOutput(mapDigests, { extra: true }),
      reduceOutput(mapDigests, {
        sections: [...reduceOutput(mapDigests).sections].reverse(),
      }),
    ]) {
      expect(preflightReduceAnalysis(output, input).status).toBe("rejected");
    }

    const base = reduceOutput(mapDigests);
    const foreignRefOutput = {
      ...base,
      sections: base.sections.map((section, index) =>
        index === 0
          ? {
              ...section,
              status: "supported",
              claims: [
                {
                  claimId: "claim-a",
                  textEs: "Observación sintética.",
                  evidenceRefs: ["e_aaaaaaaaaaaaaaaaaaaa"],
                  signal: "descriptive",
                },
              ],
            }
          : section,
      ),
    };
    expect(preflightReduceAnalysis(foreignRefOutput, input)).toMatchObject({
      status: "rejected",
    });
  });

  it("rejects prohibited and verbatim content in reduce claims", () => {
    const privateSnapshot = inputSnapshot([
      "este comentario sintético contiene ocho palabras únicas solo para prueba",
    ]);
    const ref = deriveEvidenceRef({
      reportRunId: RUN_ID,
      recordId: "synthetic-0",
      evidenceKey: KEY,
    });
    const input = {
      snapshot: privateSnapshot,
      reportRunId: RUN_ID,
      evidenceKeyId: KEY_ID,
      evidenceKey: KEY,
    };
    const outputWithText = (textEs: string) => {
      const baseOutput = reduceOutput([mapDigests[0]!]);
      return {
        ...baseOutput,
        sections: baseOutput.sections.map((section, index) =>
          index === 0
            ? {
                ...section,
                status: "supported",
                claims: [
                  {
                    claimId: "claim-a",
                    textEs,
                    evidenceRefs: [ref],
                    signal: "descriptive",
                  },
                ],
              }
            : section,
        ),
      };
    };

    expect(
      preflightReduceAnalysis(
        outputWithText("Recomendamos mejorar el acceso."),
        input,
      ),
    ).toMatchObject({ status: "rejected" });
    expect(
      preflightReduceAnalysis(
        outputWithText(
          "este comentario sintético contiene ocho palabras únicas solo para prueba",
        ),
        input,
      ),
    ).toMatchObject({ status: "rejected" });
  });
});
