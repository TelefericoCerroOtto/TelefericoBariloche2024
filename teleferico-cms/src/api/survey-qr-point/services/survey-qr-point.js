'use strict';

const { createCoreService } = require('@strapi/strapi').factories;
const { prepareQrStatus } = require('./lifecycle');

module.exports = createCoreService('api::survey-qr-point.survey-qr-point', () => ({
  prepareQrStatus,
}));
