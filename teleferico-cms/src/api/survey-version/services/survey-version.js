'use strict';

const { createCoreService } = require('@strapi/strapi').factories;
const lifecycle = require('./lifecycle');

module.exports = createCoreService('api::survey-version.survey-version', () => ({
  prepareActivation: lifecycle.prepareActivation,
  preparePublish: lifecycle.preparePublish,
}));
