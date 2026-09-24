'use strict';

const { createSubmissionPersistence } = require('../services/persistence');

function closed(value, required, optional = []) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const allowed = new Set([...required, ...optional]);
  return required.every((field) => field in value) && Object.keys(value).every((field) => allowed.has(field));
}

function validLookup(command) {
  return closed(command, ['contractVersion', 'operation', 'sessionNonceHash', 'idempotencyKey']) &&
    /^[a-f0-9]{64}$/.test(command.sessionNonceHash) && /^[A-Za-z0-9._~-]{16,128}$/.test(command.idempotencyKey);
}

function validRating(rating) {
  return closed(rating, ['aspectKey', 'label', 'sortOrder', 'rating'], ['customText']) &&
    typeof rating.aspectKey === 'string' && typeof rating.label === 'string' && Number.isSafeInteger(rating.sortOrder) &&
    ['negative', 'neutral', 'positive'].includes(rating.rating) &&
    (rating.customText === undefined || typeof rating.customText === 'string');
}

function validAcceptance(command) {
  if (!closed(command, ['contractVersion', 'operation', 'claims', 'pointDocumentId', 'versionDocumentId', 'submission']) ||
      !closed(command.claims, ['pointKey', 'publicCodeHash', 'versionKey']) ||
      !closed(command.submission, [
        'receipt', 'acceptedAt', 'source', 'locale', 'overallRating', 'ratings', 'sessionNonceHash',
        'payloadDigest', 'browserTokenHash', 'idempotencyKey', 'pointDocumentId', 'versionDocumentId',
      ], ['comment'])) return false;
  const submission = command.submission;
  return [command.pointDocumentId, command.versionDocumentId, command.claims.pointKey, command.claims.versionKey,
    submission.receipt, submission.acceptedAt, submission.pointDocumentId, submission.versionDocumentId]
    .every((value) => typeof value === 'string' && value.length > 0) &&
    /^[a-f0-9]{64}$/.test(command.claims.publicCodeHash) && submission.source === 'valid_qr' &&
    ['es', 'en', 'pt'].includes(submission.locale) && Number.isInteger(submission.overallRating) &&
    submission.overallRating >= 1 && submission.overallRating <= 5 && Array.isArray(submission.ratings) &&
    submission.ratings.length >= 1 && submission.ratings.length <= 3 && submission.ratings.every(validRating) &&
    ['sessionNonceHash', 'payloadDigest', 'browserTokenHash'].every((field) => /^[a-f0-9]{64}$/.test(submission[field])) &&
    /^[A-Za-z0-9._~-]{16,128}$/.test(submission.idempotencyKey) &&
    submission.pointDocumentId === command.pointDocumentId && submission.versionDocumentId === command.versionDocumentId &&
    (submission.comment === undefined || typeof submission.comment === 'string');
}

function validCommand(command) {
  if (!command || command.contractVersion !== 'feedback-cms-submission.v1') return false;
  return command.operation === 'lookup' ? validLookup(command) : command.operation === 'accept' && validAcceptance(command);
}

const customController = {
  async find(ctx) {
    return strapi.service('api::survey-submission.survey-submission').find(ctx.query);
  },

  async findOne(ctx) {
    return strapi.service('api::survey-submission.survey-submission').findOne(ctx.params.id, ctx.query);
  },

  async submit(ctx) {
    const command = ctx.request.body;
    if (!validCommand(command)) return ctx.badRequest('INVALID_COMMAND');
    const persistence = createSubmissionPersistence(strapi);
    if (command.operation === 'lookup') {
      ctx.body = await persistence.lookup(command);
      return;
    }
    try {
      const result = await persistence.accept(command);
      const { status, ...body } = result;
      ctx.status = status;
      ctx.body = body;
    } catch (error) {
      if (error.code === 'IDEMPOTENCY_CONFLICT') return ctx.conflict('IDEMPOTENCY_CONFLICT');
      if (error.code === 'SURVEY_UNAVAILABLE') return ctx.gone('SURVEY_UNAVAILABLE');
      throw error;
    }
  },
};

module.exports = customController;
