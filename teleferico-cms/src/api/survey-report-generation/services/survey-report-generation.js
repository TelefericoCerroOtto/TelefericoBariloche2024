'use strict';
const { createCoreService } = require('@strapi/strapi').factories;
const lifecycle = require('./lifecycle');
module.exports = createCoreService(
  'api::survey-report-generation.survey-report-generation',
  () => ({
    assertReportCreation: lifecycle.assertReportCreation,
    createLifecycle: lifecycle.createGenerationLifecycle,
    prepareCompletion: lifecycle.prepareAtomicCompletion,
    prepareDispatchFailure: lifecycle.prepareDispatchFailure,
    prepareRetry: lifecycle.prepareRetryGeneration,
    prepareTransition: lifecycle.prepareGenerationTransition,
  }),
);
