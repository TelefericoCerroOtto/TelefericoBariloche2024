'use strict';

/**
 * form-protection-submission service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService(
  'api::form-protection-submission.form-protection-submission',
);
