'use strict';

const { createCoreService } = require('@strapi/strapi').factories;
const lifecycle = require('./lifecycle');

module.exports = createCoreService(
  'api::survey-report-generation.survey-report-generation',
  () => ({
    assertReportCreation: lifecycle.assertReportCreation,
    prepareTransition: lifecycle.prepareGenerationTransition,
  }),
);
