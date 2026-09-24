'use strict';

const { createHash } = require('node:crypto');

const SUBMISSION_UID = 'api::survey-submission.survey-submission';
const POINT_UID = 'api::survey-qr-point.survey-qr-point';
const VERSION_UID = 'api::survey-version.survey-version';

function domainError(code) {
  return Object.assign(new Error(code), { code });
}

function sha256(value) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function accepted(row, status) {
  return {
    status,
    submissionReceipt: row.receipt,
    acceptedAt: new Date(row.acceptedAt ?? row.accepted_at).toISOString(),
  };
}

function createSubmissionPersistence(strapi) {
  async function resolveContext(command) {
    const [point, version] = await Promise.all([
      strapi.documents(POINT_UID).findOne({ documentId: command.pointDocumentId }),
      strapi.documents(VERSION_UID).findOne({ documentId: command.versionDocumentId }),
    ]);
    const claims = command.claims;
    if (
      !point || point.status !== 'active' || point.pointKey !== claims.pointKey ||
      sha256(point.publicCode) !== claims.publicCodeHash ||
      !version || version.versionKey !== claims.versionKey || version.status !== 'published'
    ) {
      throw domainError('SURVEY_UNAVAILABLE');
    }
    return { pointDocumentId: point.documentId, versionDocumentId: version.documentId };
  }

  async function accept(command) {
    const context = await resolveContext(command);
    const submission = command.submission;

    return strapi.db.transaction(async ({ trx }) => {
      const pair = `${submission.sessionNonceHash}:${submission.idempotencyKey}`;
      await trx.raw('SELECT pg_advisory_xact_lock(hashtextextended(?, 0))', [pair]);
      const existing = await trx('survey_submissions')
        .select('receipt', 'accepted_at', 'payload_digest')
        .where({
          session_nonce_hash: submission.sessionNonceHash,
          idempotency_key: submission.idempotencyKey,
        })
        .forUpdate()
        .first();
      if (existing) {
        if (existing.payload_digest !== submission.payloadDigest) {
          throw domainError('IDEMPOTENCY_CONFLICT');
        }
        return accepted(existing, 200);
      }

      const created = await strapi.documents(SUBMISSION_UID).create({
        data: {
          ...submission,
          ratings: submission.ratings.map((rating) => ({
            ...rating,
            ownerReceipt: submission.receipt,
          })),
          qrPoint: { connect: [context.pointDocumentId] },
          surveyVersion: { connect: [context.versionDocumentId] },
        },
        populate: ['ratings', 'qrPoint', 'surveyVersion'],
      });
      return accepted(created, 201);
    });
  }

  async function lookup(command) {
    const existing = await strapi.db.connection('survey_submissions')
      .select('receipt', 'accepted_at', 'payload_digest')
      .where({
        session_nonce_hash: command.sessionNonceHash,
        idempotency_key: command.idempotencyKey,
      })
      .first();
    if (!existing) return null;
    return {
      receipt: existing.receipt,
      acceptedAt: new Date(existing.accepted_at).toISOString(),
      payloadDigest: existing.payload_digest,
    };
  }

  return Object.freeze({ accept, lookup, resolveContext });
}

module.exports = { createSubmissionPersistence };
