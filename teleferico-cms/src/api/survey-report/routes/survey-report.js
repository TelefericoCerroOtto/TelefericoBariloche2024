"use strict";

const { createCoreRouter } = require("@strapi/strapi").factories;

module.exports = createCoreRouter("api::survey-report.survey-report", {
  only: ["find", "findOne"],
});
