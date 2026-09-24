"use strict";

module.exports = {
  async find(ctx) {
    return strapi.service("api::survey-report.survey-report").find(ctx.query);
  },

  async findOne(ctx) {
    return strapi.service("api::survey-report.survey-report").findOne(ctx.params.id, ctx.query);
  },
};
