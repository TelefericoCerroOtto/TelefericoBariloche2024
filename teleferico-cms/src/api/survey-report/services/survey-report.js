'use strict';

const { createCoreService } = require('@strapi/strapi').factories;
const { assertReportCreation } = require('../../survey-report-generation/services/lifecycle');

function assertImmutable() {
  throw Object.assign(new Error('REPORT_IMMUTABLE'), { code: 'REPORT_IMMUTABLE' });
}

module.exports = createCoreService('api::survey-report.survey-report', () => ({
  assertCreatable: assertReportCreation,
  assertImmutable,
}));
