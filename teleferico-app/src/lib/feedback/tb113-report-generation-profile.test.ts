import { describe, expect, it } from "vitest";
import { readTb113ApprovedGenerationConfiguration } from "@teleferico/tb113-runtime-contracts";
import { loadTb113ReportGenerationProfile } from "../../../../packages/tb113-runtime-contracts/src/report-generation-profile.cjs";

function syntheticProfile(
  inputLimit: number | null = 25_000,
  inputRate: number | null = 100,
  outputRate: number | null = 200,
) {
  return {
    profileVersion: "feedback-report-generation-profile.v1",
    sourceRevision: "feedback-report-profile.v1",
    evidenceKeyId: "feedback-report-evidence.v1",
    modelConfig: {
      version: "survey-model-config.v1",
      provider: "vertex-ai",
      vertexProjectId: "teleferico-bariloche-2024",
      vertexLocation: "us",
      vertexApiEndpoint: "aiplatform.us.rep.googleapis.com",
      model: "gemini-3.8-flash",
      temperature: 0,
      reasoning: "LOW",
      grounding: false,
      promptVersion: "feedback-report-prompt.v1",
      mapSchemaVersion: "survey-map.v1",
      analysisSchemaVersion: "survey-analysis.v1",
      redactionVersion: "feedback-report-redaction.v1",
      validatorVersion: "feedback-report-validator.v1",
      chunkVersion: "feedback-report-chunk.v1",
      verifiedInputTokenLimit: inputLimit,
      map: { targetMin: 600, targetMax: 1200, hardMax: 4000 },
      directReduce: { targetMin: 1800, targetMax: 3000, hardMax: 8000 },
    },
    pricingSnapshot: {
      version: "feedback-report-pricing.v1",
      currency: "USD",
      units: [{ sku: "gemini-3.8-flash", inputMicrosPerMillion: inputRate, outputMicrosPerMillion: outputRate }],
    },
  };
}

describe("TB-113 shared report-generation profile", () => {
  it("uses the approved public model budget and standard non-global prices", () => {
    const profile = loadTb113ReportGenerationProfile();
    expect(profile.profileVersion).toBe("feedback-report-generation-profile.v1");
    expect(Object.keys(profile).sort()).toEqual(["generation", "profileVersion"]);
    expect(profile.generation.sourceRevision).toBe("feedback-report-profile.v1");
    expect(profile.generation.evidenceKeyId).toBe("feedback-report-evidence.v1");
    const modelConfig = profile.generation.modelConfig as Record<string, unknown>;
    const pricingSnapshot = profile.generation.pricingSnapshot as Record<string, unknown>;
    expect(modelConfig.promptVersion).toBe("feedback-report-prompt.v1");
    expect(modelConfig.redactionVersion).toBe("feedback-report-redaction.v1");
    expect(modelConfig.validatorVersion).toBe("feedback-report-validator.v1");
    expect(modelConfig.chunkVersion).toBe("feedback-report-chunk.v1");
    expect(pricingSnapshot.version).toBe("feedback-report-pricing.v1");
    expect(modelConfig.verifiedInputTokenLimit).toBe(1_048_576);
    expect(modelConfig.safetyHeadroomTokens).toBe(104_858);
    expect(pricingSnapshot.units).toEqual([{
      sku: "gemini-3.8-flash",
      inputMicrosPerMillion: 1_650_000,
      outputMicrosPerMillion: 8_250_000,
    }]);
    const configuration = readTb113ApprovedGenerationConfiguration(profile);
    expect(configuration.modelConfig.directReduce.targetMax).toBe(3_000);
    expect(
      configuration.modelConfig.verifiedInputTokenLimit -
        configuration.modelConfig.safetyHeadroomTokens -
        configuration.modelConfig.directReduce.targetMax,
    ).toBe(940_718);
    expect(configuration.pricingSnapshot.units[0]!.inputMicrosPerMillion).toBe(1_650_000);
    expect(configuration.pricingSnapshot.units[0]!.outputMicrosPerMillion).toBe(8_250_000);
  });

  it("fails closed when an explicitly injected profile has unset live values", () => {
    const profile = loadTb113ReportGenerationProfile(syntheticProfile(null, null, null));
    expect(() => readTb113ApprovedGenerationConfiguration(profile)).toThrow(
      "TB-113 report profile is not configured",
    );
  });

  it("derives headroom, reconciles code metadata, and leaves prior snapshots immutable", () => {
    const rawProfile = syntheticProfile();
    const profile = loadTb113ReportGenerationProfile(rawProfile);
    const configuration = readTb113ApprovedGenerationConfiguration(profile);

    expect(configuration.sourceRevision).toBe("feedback-report-profile.v1");
    expect(configuration.modelConfig.sourceRevision).toBe(configuration.sourceRevision);
    expect(configuration.evidenceKeyId).toBe("feedback-report-evidence.v1");
    expect(configuration.modelConfig.evidenceKeyId).toBe(configuration.evidenceKeyId);
    expect(configuration.modelConfig.safetyHeadroomTokens).toBe(2500);
    expect(configuration.pricingSnapshot.units[0]).toEqual({
      sku: "gemini-3.8-flash",
      inputMicrosPerMillion: 100,
      outputMicrosPerMillion: 200,
    });
    expect(rawProfile.modelConfig).not.toHaveProperty("safetyHeadroomTokens");
    expect(rawProfile.modelConfig).not.toHaveProperty("sourceRevision");
    expect(rawProfile.modelConfig).not.toHaveProperty("evidenceKeyId");
    expect(Object.isFrozen(configuration)).toBe(true);
    expect(Object.isFrozen(configuration.modelConfig)).toBe(true);
    expect(Object.isFrozen(configuration.pricingSnapshot.units[0])).toBe(true);

    const priorStoredSnapshot = JSON.parse(JSON.stringify(configuration));
    const serializedPriorSnapshot = JSON.stringify(priorStoredSnapshot);
    const next = readTb113ApprovedGenerationConfiguration(
      loadTb113ReportGenerationProfile(syntheticProfile(50_000, 300, 400)),
    );
    expect(next.modelConfig.safetyHeadroomTokens).toBe(5000);
    expect(next.pricingSnapshot.units[0].inputMicrosPerMillion).toBe(300);
    expect(priorStoredSnapshot.modelConfig.safetyHeadroomTokens).toBe(2500);
    expect(priorStoredSnapshot.pricingSnapshot.units[0].inputMicrosPerMillion).toBe(100);
    expect(JSON.stringify(priorStoredSnapshot)).toBe(serializedPriorSnapshot);
  });
});
