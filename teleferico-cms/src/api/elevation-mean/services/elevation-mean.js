'use strict';

/**
 * elevation-mean service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::elevation-mean.elevation-mean');
