'use strict';

const SOURCE_CONTRACT = 'survey-generation-source.v1';
const ADMIN_CONTRACT = 'feedback-admin-source.v1';
const PAGE_SIZE = 25;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const CURSOR_PATTERN = /^[A-Za-z0-9_-]{1,2048}$/;

function adminReadError(code) {
  return Object.assign(new Error(code), { code });
}

function isInstant(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

function exactKeys(value, keys) {
  return value && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function decodeCursor(value, query) {
  if (value === null) return null;
  try {
    const bytes = Buffer.from(value, 'base64url');
    if (bytes.toString('base64url') !== value) throw new Error();
    const cursor = JSON.parse(bytes.toString('utf8'));
    const keys = ['version', 'resource', 'acceptedAtGte', 'acceptedAtLte', 'dataCutoffAt', 'after'];
    if (!exactKeys(cursor, keys) || cursor.version !== 1 || cursor.resource !== query.resource ||
        cursor.acceptedAtGte !== query.acceptedAtGte || cursor.acceptedAtLte !== query.acceptedAtLte ||
        cursor.dataCutoffAt !== query.dataCutoffAt) throw new Error();
    if (query.resource === 'reports') {
      if (!exactKeys(cursor.after, ['createdAt', 'reportId']) || !isInstant(cursor.after.createdAt) ||
          typeof cursor.after.reportId !== 'string' || !UUID_PATTERN.test(cursor.after.reportId)) throw new Error();
    } else if (typeof cursor.after !== 'string' || cursor.after.length === 0 || cursor.after.length > 1024) {
      throw new Error();
    }
    return cursor.after;
  } catch {
    throw adminReadError('VALIDATION_FAILED');
  }
}

function encodeCursor(query, after) {
  return Buffer.from(JSON.stringify({
    version: 1,
    resource: query.resource,
    acceptedAtGte: query.acceptedAtGte,
    acceptedAtLte: query.acceptedAtLte,
    dataCutoffAt: query.dataCutoffAt,
    after,
  }), 'utf8').toString('base64url');
}

function validateQuery(query) {
  const keys = ['contractVersion', 'resource', 'acceptedAtGte', 'acceptedAtLte', 'dataCutoffAt', 'cursor', 'pageSize'];
  if (!exactKeys(query, keys) || query.contractVersion !== ADMIN_CONTRACT ||
      !['submissions', 'versions', 'points', 'reports'].includes(query.resource) ||
      !isInstant(query.acceptedAtGte) || !isInstant(query.acceptedAtLte) ||
      !isInstant(query.dataCutoffAt) || Date.parse(query.acceptedAtGte) > Date.parse(query.acceptedAtLte) ||
      !Number.isSafeInteger(query.pageSize) || query.pageSize !== PAGE_SIZE ||
      (query.cursor !== null && (typeof query.cursor !== 'string' || !CURSOR_PATTERN.test(query.cursor)))) {
    throw adminReadError('VALIDATION_FAILED');
  }
}

function createPrivateFeedbackAdminReader(strapi) {
  const readSourcePage = require('./private-report-source').createPrivateReportSourceReader(strapi);
  return Object.freeze({
    async readPage(query) {
      validateQuery(query);
      const after = decodeCursor(query.cursor, query);
      try {
        if (query.resource !== 'reports') {
          const result = await readSourcePage.readPage({
            contractVersion: SOURCE_CONTRACT,
            resource: query.resource,
            acceptedAtGte: query.acceptedAtGte,
            acceptedAtLte: query.acceptedAtLte,
            dataCutoffAt: query.dataCutoffAt,
            cursor: after,
            pageSize: PAGE_SIZE,
          });
          return {
            contractVersion: ADMIN_CONTRACT,
            resource: query.resource,
            cursor: query.cursor,
            nextCursor: result.nextCursor === null ? null : encodeCursor(query, result.nextCursor),
            total: result.total,
            items: result.items,
          };
        }

        const where = { createdAt: { $lte: query.dataCutoffAt } };
        if (after) {
          where.$or = [
            { createdAt: { $lt: after.createdAt } },
            { createdAt: after.createdAt, reportId: { $gt: after.reportId } },
          ];
        }
        const [total, rows] = await Promise.all([
          strapi.db.query('api::survey-report.survey-report').count({ where }),
          strapi.db.query('api::survey-report.survey-report').findMany({
            where,
            orderBy: [{ createdAt: 'desc' }, { reportId: 'asc' }],
            limit: PAGE_SIZE + 1,
            fields: [
              'id', 'documentId',
              'reportId', 'generationRunId', 'periodStart', 'periodEnd', 'dataCutoffAt',
              'artifactSha256', 'artifactSize', 'mimeType', 'objectKey', 'createdAt',
            ],
            populate: {
              sourceGeneration: {
                fields: ['reportRunId', 'status', 'snapshotJson'],
                populate: { requestedBy: { fields: ['id'] } },
              },
              generatedBy: { fields: ['id'] },
            },
          }),
        ]);
        if (!Number.isSafeInteger(Number(total)) || Number(total) < 0 || !Array.isArray(rows))
          throw adminReadError('SOURCE_UNAVAILABLE');
        const hasMore = rows.length > PAGE_SIZE;
        const items = rows.slice(0, PAGE_SIZE).map((row) => {
          const generation = row.sourceGeneration;
          if (!generation || generation.status !== 'succeeded' ||
              generation.reportRunId !== row.generationRunId ||
              typeof row.reportId !== 'string' || !UUID_PATTERN.test(row.reportId) ||
              typeof row.generationRunId !== 'string' || !UUID_PATTERN.test(row.generationRunId) ||
              typeof row.objectKey !== 'string' || row.objectKey !== `private/feedback-reports/${row.reportId}/report.pdf` ||
              typeof row.artifactSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(row.artifactSha256) ||
              !Number.isSafeInteger(Number(row.artifactSize)) || Number(row.artifactSize) < 1 ||
              row.mimeType !== 'application/pdf' || !row.dataCutoffAt || !row.createdAt ||
              !row.periodStart || !row.periodEnd || !generation.snapshotJson ||
              !Object.hasOwn(row, 'generatedBy') || !Object.hasOwn(generation, 'requestedBy')) {
            throw adminReadError('SOURCE_UNAVAILABLE');
          }
          let snapshot = generation.snapshotJson;
          if (typeof snapshot === 'string') {
            try { snapshot = JSON.parse(snapshot); } catch { throw adminReadError('SOURCE_UNAVAILABLE'); }
          }
          const population = snapshot?.payload?.population;
          if (!population || !Number.isSafeInteger(population.currentSubmissionCount) ||
              !Number.isSafeInteger(population.currentCommentCount)) throw adminReadError('SOURCE_UNAVAILABLE');
          return {
            documentId: row.documentId || String(row.id),
            reportId: row.reportId,
            generationRunId: row.generationRunId,
            periodStart: row.periodStart,
            periodEnd: row.periodEnd,
            dataCutoffAt: row.dataCutoffAt,
            createdAt: row.createdAt,
            analyzedResponseCount: population.currentSubmissionCount,
            analyzedCommentCount: population.currentCommentCount,
            artifactSha256: row.artifactSha256,
            artifactSize: Number(row.artifactSize),
            mimeType: row.mimeType,
            objectKey: row.objectKey,
            status: generation.status,
            requestedBy: generation.requestedBy ? String(generation.requestedBy.id) : null,
            generatedBy: row.generatedBy ? String(row.generatedBy.id) : null,
          };
        });
        const last = rows[Math.min(rows.length, PAGE_SIZE) - 1];
        const nextCursor = hasMore && last
          ? encodeCursor(query, { createdAt: new Date(last.createdAt).toISOString(), reportId: last.reportId })
          : null;
        return {
          contractVersion: ADMIN_CONTRACT,
          resource: query.resource,
          cursor: query.cursor,
          nextCursor,
          total: Number(total),
          items,
        };
      } catch (error) {
        if (error.code === 'VALIDATION_FAILED' || error.code === 'SOURCE_UNAVAILABLE') throw error;
        throw adminReadError('SOURCE_UNAVAILABLE');
      }
    },
  });
}

module.exports = { createPrivateFeedbackAdminReader, validateQuery };
