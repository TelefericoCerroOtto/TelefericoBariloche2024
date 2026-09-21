'use strict';

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::survey-submission.survey-submission', {
  only: ['find', 'findOne'],
});
