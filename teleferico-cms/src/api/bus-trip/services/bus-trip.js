'use strict';

/**
 * bus-trip service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::bus-trip.bus-trip');
