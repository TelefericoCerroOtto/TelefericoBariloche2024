'use strict';

const { createHash, randomUUID } = require('node:crypto');

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
  async function resolveContext(command, localFixture = false) {
    const [point, version] = await Promise.all(localFixture ? [
      strapi.db.query(POINT_UID).findOne({
        where: { documentId: command.pointDocumentId },
        select: ['id', 'documentId', 'pointKey', 'publicCode', 'status'],
      }),
      strapi.db.query(VERSION_UID).findOne({
        where: { documentId: command.versionDocumentId },
        select: ['id', 'documentId', 'versionKey', 'status'],
      }),
    ] : [
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
    return {
      pointId: point.id,
      pointDocumentId: point.documentId,
      versionId: version.id,
      versionDocumentId: version.documentId,
    };
  }

  async function acceptWithMode(command, fixtureMarker) {
    const localFixture = fixtureMarker !== null;
    const context = await resolveContext(command, localFixture);
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

      let created;
      if (localFixture) {
        // Keep seed-owned row, components, and relations in the idempotency trx without nested document-service hydration.
        const now = new Date();
        [created] = await trx('survey_submissions').insert({
          document_id: randomUUID(),
          receipt: submission.receipt,
          accepted_at: new Date(submission.acceptedAt),
          source: submission.source,
          locale: submission.locale,
          overall_rating: submission.overallRating,
          comment: submission.comment ?? null,
          session_nonce_hash: submission.sessionNonceHash,
          payload_digest: submission.payloadDigest,
          browser_token_hash: submission.browserTokenHash,
          idempotency_key: submission.idempotencyKey,
          fixture_marker: fixtureMarker,
          created_at: now,
          updated_at: now,
          published_at: null,
        }).returning(['id', 'receipt', 'accepted_at']);

        for (const [order, rating] of submission.ratings.entries()) {
          const [component] = await trx('components_survey_aspect_ratings').insert({
            owner_receipt: submission.receipt,
            aspect_key: rating.aspectKey,
            label: rating.label,
            sort_order: rating.sortOrder,
            rating: rating.rating,
            custom_text: rating.customText ?? null,
          }).returning('id');
          await trx('survey_submissions_cmps').insert({
            entity_id: created.id,
            cmp_id: component.id,
            component_type: 'survey.aspect-rating',
            field: 'ratings',
            order,
          });
        }
        await trx('survey_submissions_qr_point_lnk').insert({
          survey_submission_id: created.id,
          survey_qr_point_id: context.pointId,
        });
        await trx('survey_submissions_survey_version_lnk').insert({
          survey_submission_id: created.id,
          survey_version_id: context.versionId,
        });
      } else {
        created = await strapi.documents(SUBMISSION_UID).create({
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
      }
      return accepted(created, 201);
    });
  }

  async function accept(command) {
    return acceptWithMode(command, null);
  }

  async function acceptLocalFixture(command, fixtureMarker) {
    if (typeof fixtureMarker !== 'string' || !/^[a-z0-9][a-z0-9._-]{0,63}$/.test(fixtureMarker)) {
      throw new TypeError('Local fixture marker is invalid');
    }
    return acceptWithMode(command, fixtureMarker);
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

  return Object.freeze({ accept, acceptLocalFixture, lookup, resolveContext });
}

module.exports = { createSubmissionPersistence };
