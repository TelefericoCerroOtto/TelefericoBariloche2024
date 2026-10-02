'use strict';

const PROFILE_VERSION = 'feedback-report-generation-profile.v1';
const GENERATION_CONTRACT_VERSION = 'survey-approved-generation-config.v1';
const HEADROOM_MINIMUM = 2048;

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function cloneJsonValue(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadTb113ReportGenerationProfile(injectedProfile) {
  const profile = injectedProfile === undefined
    ? require('../config/report-generation.json')
    : injectedProfile;
  const keys = ['profileVersion', 'sourceRevision', 'evidenceKeyId', 'modelConfig', 'pricingSnapshot'];
  if (!profile || typeof profile !== 'object' || Array.isArray(profile) ||
      Object.keys(profile).length !== keys.length ||
      !keys.every((key) => Object.hasOwn(profile, key)) ||
      profile.profileVersion !== PROFILE_VERSION ||
      typeof profile.sourceRevision !== 'string' || !profile.sourceRevision ||
      typeof profile.evidenceKeyId !== 'string' || !profile.evidenceKeyId ||
      !profile.modelConfig || typeof profile.modelConfig !== 'object' || Array.isArray(profile.modelConfig) ||
      Object.hasOwn(profile.modelConfig, 'evidenceKeyId') ||
      Object.hasOwn(profile.modelConfig, 'sourceRevision') ||
      Object.hasOwn(profile.modelConfig, 'safetyHeadroomTokens') ||
      !profile.pricingSnapshot || typeof profile.pricingSnapshot !== 'object' || Array.isArray(profile.pricingSnapshot))
    throw new TypeError('TB-113 report profile is invalid');
  const inputLimit = profile.modelConfig.verifiedInputTokenLimit;
  const safetyHeadroomTokens = Number.isSafeInteger(inputLimit) && inputLimit > 0
    ? Math.max(HEADROOM_MINIMUM, Math.ceil(inputLimit * 0.1))
    : null;
  const modelConfig = cloneJsonValue(profile.modelConfig);
  modelConfig.evidenceKeyId = profile.evidenceKeyId;
  modelConfig.sourceRevision = profile.sourceRevision;
  modelConfig.safetyHeadroomTokens = safetyHeadroomTokens;
  const generation = {
    contractVersion: GENERATION_CONTRACT_VERSION,
    sourceRevision: profile.sourceRevision,
    evidenceKeyId: profile.evidenceKeyId,
    modelConfig,
    pricingSnapshot: cloneJsonValue(profile.pricingSnapshot),
  };
  return deepFreeze({ profileVersion: profile.profileVersion, generation });
}

module.exports = { loadTb113ReportGenerationProfile };
