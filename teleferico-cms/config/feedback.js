'use strict';

const { createFeedbackCheckpointProviders } = require('../src/api/survey-report-generation/services/google-checkpoint-providers');
const { loadTb113ReportGenerationProfile } = require('../../packages/tb113-runtime-contracts/src/report-generation-profile.cjs');
const { readHost, readPort } = require('./server');

const RUNTIME_KEYS = [
  'NODE_ENV',
  'BUILD_STRAPI_BASE_URL',
  'FEEDBACK_CMS_ALLOWED_ORIGIN',
  'FEEDBACK_WORKER_EVIDENCE_KEY',
  'FEEDBACK_VERTEX_PROJECT_ID',
  'K_SERVICE',
  'K_REVISION',
  'GOOGLE_APPLICATION_CREDENTIALS',
];

module.exports = ({ env }) => {
  const runtimeEnv = Object.fromEntries(RUNTIME_KEYS.map((key) => [key, env(key)]));
  runtimeEnv.HOST = readHost(env);
  runtimeEnv.PORT = readPort(env);
  return createFeedbackCheckpointProviders({
    env: runtimeEnv,
    approvedGenerationProfile: loadTb113ReportGenerationProfile(),
  });
};
