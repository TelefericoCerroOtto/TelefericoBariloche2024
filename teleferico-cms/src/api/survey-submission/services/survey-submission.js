'use strict';

const { createCoreService } = require('@strapi/strapi').factories;
const { prepareSubmission } = require('./lifecycle');

function assertImmutable() {
  throw Object.assign(new Error('SUBMISSION_IMMUTABLE'), { code: 'SUBMISSION_IMMUTABLE' });
}

module.exports = createCoreService('api::survey-submission.survey-submission', () => ({
  assertImmutable,
  prepareSubmission,
}));
