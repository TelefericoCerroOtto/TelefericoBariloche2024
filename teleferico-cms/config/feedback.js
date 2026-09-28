'use strict';

const { createFeedbackCheckpointProviders } = require('../src/api/survey-report-generation/services/google-checkpoint-providers');

const RUNTIME_KEYS = [
  'TB113_APPROVED_GENERATION_CONFIG_JSON',
  'TB113_WORKER_EVIDENCE_KEY',
  'TB113_VERTEX_PROJECT_ID',
  'K_SERVICE',
  'K_REVISION',
  'GOOGLE_APPLICATION_CREDENTIALS',
];

module.exports = ({ env }) => createFeedbackCheckpointProviders({
  env: Object.fromEntries(RUNTIME_KEYS.map((key) => [key, env(key)])),
});
