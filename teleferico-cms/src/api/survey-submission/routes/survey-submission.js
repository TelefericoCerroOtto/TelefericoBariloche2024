'use strict';

module.exports = {
  type: 'content-api',
  routes: [
    { method: 'GET', path: '/tb113/public/surveys/:publicCode', handler: 'survey-submission.resolveSurvey' },
    { method: 'POST', path: '/tb113/public/submissions', handler: 'survey-submission.submit' },
  ],
};
