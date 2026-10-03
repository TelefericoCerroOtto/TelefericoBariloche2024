import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { loadTb113ReportGenerationProfile } = require(
  "../../../packages/tb113-runtime-contracts/src/report-generation-profile.cjs",
);

test("shared report-generation profile is deeply immutable and pins approved context and prices", () => {
  const profile = loadTb113ReportGenerationProfile();

  assert.equal(profile.profileVersion, "feedback-report-generation-profile.v1");
  assert.ok(Object.isFrozen(profile));
  assert.ok(Object.isFrozen(profile.generation));
  assert.ok(Object.isFrozen(profile.generation.modelConfig));
  assert.ok(Object.isFrozen(profile.generation.pricingSnapshot.units[0]));
  assert.equal(profile.generation.sourceRevision, "feedback-report-profile.v1");
  assert.equal(profile.generation.evidenceKeyId, "feedback-report-evidence.v1");
  assert.equal(profile.generation.modelConfig.sourceRevision, profile.generation.sourceRevision);
  assert.equal(profile.generation.modelConfig.evidenceKeyId, profile.generation.evidenceKeyId);
  assert.deepEqual(Object.keys(profile).sort(), ["generation", "profileVersion"]);
  assert.equal(profile.generation.modelConfig.verifiedInputTokenLimit, 1_048_576);
  assert.equal(profile.generation.modelConfig.safetyHeadroomTokens, 104_858);
  assert.equal(profile.generation.pricingSnapshot.units[0].inputMicrosPerMillion, 1_650_000);
  assert.equal(profile.generation.pricingSnapshot.units[0].outputMicrosPerMillion, 8_250_000);
  const directOutputReserve = profile.generation.modelConfig.directReduce.targetMax;
  const remainingPromptBudget = profile.generation.modelConfig.verifiedInputTokenLimit -
    profile.generation.modelConfig.safetyHeadroomTokens - directOutputReserve;
  assert.equal(directOutputReserve, 3_000);
  assert.equal(remainingPromptBudget, 940_718);
  assert.equal((BigInt(1_650_000) * 1_000n) / 1_000_000n, 1_650n);
  assert.equal((BigInt(8_250_000) * 1_000n) / 1_000_000n, 8_250n);
  assert.throws(() => { profile.generation.modelConfig.model = "other"; }, TypeError);
});

test("explicitly injected unset values remain invalid", () => {
  const profile = loadTb113ReportGenerationProfile({
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
      verifiedInputTokenLimit: null,
      map: { targetMin: 600, targetMax: 1200, hardMax: 4000 },
      directReduce: { targetMin: 1800, targetMax: 3000, hardMax: 8000 },
    },
    pricingSnapshot: {
      version: "feedback-report-pricing.v1",
      currency: "USD",
      units: [{ sku: "gemini-3.8-flash", inputMicrosPerMillion: null, outputMicrosPerMillion: null }],
    },
  });

  assert.equal(profile.generation.modelConfig.safetyHeadroomTokens, null);
});

test("profile projection adds duplicated metadata and derives headroom without mutating source data", () => {
  const rawProfile = {
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
      verifiedInputTokenLimit: 25_000,
      map: { targetMin: 600, targetMax: 1200, hardMax: 4000 },
      directReduce: { targetMin: 1800, targetMax: 3000, hardMax: 8000 },
    },
    pricingSnapshot: {
      version: "feedback-report-pricing.v1",
      currency: "USD",
      units: [{ sku: "gemini-3.8-flash", inputMicrosPerMillion: 100, outputMicrosPerMillion: 200 }],
    },
  };
  const profile = loadTb113ReportGenerationProfile(rawProfile);

  assert.equal(profile.generation.modelConfig.safetyHeadroomTokens, 2500);
  assert.equal(profile.generation.modelConfig.sourceRevision, rawProfile.sourceRevision);
  assert.equal(profile.generation.modelConfig.evidenceKeyId, rawProfile.evidenceKeyId);
  assert.equal(Object.hasOwn(rawProfile.modelConfig, "safetyHeadroomTokens"), false);
  assert.equal(Object.hasOwn(rawProfile.modelConfig, "sourceRevision"), false);
  assert.equal(Object.hasOwn(rawProfile.modelConfig, "evidenceKeyId"), false);
  rawProfile.modelConfig.map.targetMin = 610;
  rawProfile.pricingSnapshot.units[0].inputMicrosPerMillion = 999;
  assert.equal(profile.generation.modelConfig.map.targetMin, 600);
  assert.equal(profile.generation.pricingSnapshot.units[0].inputMicrosPerMillion, 100);
});
