'use strict';

/**
 * service-state service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::service-state.service-state');
