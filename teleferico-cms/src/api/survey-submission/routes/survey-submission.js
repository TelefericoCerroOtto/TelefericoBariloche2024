'use strict';

module.exports = {
  type: 'content-api',
  routes: [
    { method: 'POST', path: '/tb113/public/submissions', handler: 'survey-submission.submit' },
  ],
};
