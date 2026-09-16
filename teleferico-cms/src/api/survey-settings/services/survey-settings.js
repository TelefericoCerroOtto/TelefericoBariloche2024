'use strict';

const { createCoreService } = require('@strapi/strapi').factories;
const { prepareActivation } = require('../../survey-version/services/lifecycle');

module.exports = createCoreService('api::survey-settings.survey-settings', () => ({
  prepareActivation,
}));
