'use strict';

/**
 * zone service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::zone.zone');
