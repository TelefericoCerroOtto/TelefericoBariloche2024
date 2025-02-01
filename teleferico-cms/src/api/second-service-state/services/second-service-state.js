'use strict';

/**
 * second-service-state service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::second-service-state.second-service-state');
