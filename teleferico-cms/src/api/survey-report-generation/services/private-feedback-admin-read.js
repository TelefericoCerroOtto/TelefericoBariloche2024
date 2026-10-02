'use strict';

const SOURCE_CONTRACT = 'survey-generation-source.v1';
const ADMIN_CONTRACT = 'feedback-admin-source.v1';
const PAGE_SIZE = 25;
const GENERATION_STATUSES = ['queued', 'running', 'succeeded', 'failed'];
const SAFE_FAILURE_MESSAGES = {
  PROVIDER_TRANSIENT: 'The report provider is temporarily unavailable.',
  PROVIDER_RATE_LIMIT: 'The report provider is temporarily busy.',
  PROVIDER_TIMEOUT: 'The report provider timed out.',
  CMS_TRANSIENT: 'Report state could not be persisted.',
  STORAGE_TRANSIENT: 'The report artifact could not be staged.',
  INVALID_OUTPUT: 'The report output did not satisfy its contract.',
  AUTHENTICATION: 'The report worker authentication failed.',
  CONFIGURATION: 'Report generation is not configured.',
  UNKNOWN_VERSION: 'The report contract version is not supported.',
  INVARIANT: 'The report state failed an integrity check.',
  PROHIBITED_CONTENT: 'The report output contained prohibited content.',
  QUEUE_ENQUEUE_EXHAUSTED: 'The report could not be queued.',
};
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

function reportingDate(value) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(new Date(value));
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
    const keys = ['version', 'resource', 'acceptedAtGte', 'acceptedAtLte', 'dataCutoffAt', 'after', ...(query.resource === 'generations' ? ['status'] : [])];
    if (!exactKeys(cursor, keys) || cursor.version !== 1 || cursor.resource !== query.resource ||
        cursor.acceptedAtGte !== query.acceptedAtGte || cursor.acceptedAtLte !== query.acceptedAtLte ||
        cursor.dataCutoffAt !== query.dataCutoffAt ||
        (query.resource === 'generations' && cursor.status !== query.status)) throw new Error();
    if (query.resource === 'reports' || query.resource === 'generations') {
      const idKey = query.resource === 'reports' ? 'reportId' : 'reportRunId';
      if (!exactKeys(cursor.after, ['createdAt', idKey]) || !isInstant(cursor.after.createdAt) ||
          typeof cursor.after[idKey] !== 'string' || !UUID_PATTERN.test(cursor.after[idKey])) throw new Error();
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
    ...(query.resource === 'generations' ? { status: query.status } : {}),
  }), 'utf8').toString('base64url');
}

function validateQuery(query) {
  const baseKeys = ['contractVersion', 'resource', 'acceptedAtGte', 'acceptedAtLte', 'dataCutoffAt', 'cursor', 'pageSize'];
  const keys = query && query.resource === 'generations' ? [...baseKeys, 'status'] : baseKeys;
  if (!exactKeys(query, keys) || query.contractVersion !== ADMIN_CONTRACT ||
      !['submissions', 'versions', 'points', 'reports', 'generations'].includes(query.resource) ||
      !isInstant(query.acceptedAtGte) || !isInstant(query.acceptedAtLte) ||
      !isInstant(query.dataCutoffAt) || Date.parse(query.acceptedAtGte) > Date.parse(query.acceptedAtLte) ||
      !Number.isSafeInteger(query.pageSize) || query.pageSize !== PAGE_SIZE ||
      (query.cursor !== null && (typeof query.cursor !== 'string' || !CURSOR_PATTERN.test(query.cursor))) ||
      (query.resource === 'generations' && query.status !== null && !GENERATION_STATUSES.includes(query.status))) {
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
          if (query.resource === 'generations') return readGenerationPage(strapi, query, after);
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
          const population = snapshot?.population;
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

async function readGenerationPage(strapi, query, after) {
  const where = {
    periodStart: { $lte: reportingDate(query.acceptedAtLte) },
    periodEnd: { $gte: reportingDate(query.acceptedAtGte) },
    createdAt: { $lte: query.dataCutoffAt },
  };
  if (query.status !== null) where.status = query.status;
  if (after) {
    where.$and = [{
      $or: [
        { createdAt: { $lt: after.createdAt } },
        { createdAt: after.createdAt, reportRunId: { $gt: after.reportRunId } },
      ],
    }];
  }
  try {
    const baseWhere = { ...where };
    delete baseWhere.$and;
    const [total, rows] = await Promise.all([
      strapi.db.query('api::survey-report-generation.survey-report-generation').count({ where: baseWhere }),
      strapi.db.query('api::survey-report-generation.survey-report-generation').findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { reportRunId: 'asc' }],
        limit: PAGE_SIZE + 1,
        fields: ['reportRunId', 'periodStart', 'periodEnd', 'dataCutoffAt', 'status', 'createdAt', 'completedAt', 'failureCode', 'safeFailureMessage', 'snapshotJson'],
        populate: {
          retryOfGeneration: { fields: ['reportRunId'] },
          report: { fields: ['reportId', 'createdAt', 'periodStart', 'periodEnd', 'generationRunId'] },
        },
      }),
    ]);
    if (!Number.isSafeInteger(Number(total)) || Number(total) < 0 || !Array.isArray(rows))
      throw adminReadError('SOURCE_UNAVAILABLE');
    const hasMore = rows.length > PAGE_SIZE;
    const items = rows.slice(0, PAGE_SIZE).map((row) => {
      if (typeof row.reportRunId !== 'string' || !UUID_PATTERN.test(row.reportRunId) ||
          !GENERATION_STATUSES.includes(row.status) || !row.periodStart || !row.periodEnd ||
          !isInstant(row.createdAt) || !isInstant(row.dataCutoffAt) ||
          (row.completedAt !== null && row.completedAt !== undefined && !isInstant(row.completedAt)))
        throw adminReadError('SOURCE_UNAVAILABLE');
      let failureCode = null;
      let safeFailureMessage = null;
      if (row.status === 'failed') {
        if (typeof row.failureCode !== 'string' || !Object.hasOwn(SAFE_FAILURE_MESSAGES, row.failureCode) ||
            row.safeFailureMessage !== SAFE_FAILURE_MESSAGES[row.failureCode])
          throw adminReadError('SOURCE_UNAVAILABLE');
        failureCode = row.failureCode;
        safeFailureMessage = SAFE_FAILURE_MESSAGES[row.failureCode];
      } else if ((row.failureCode !== null && row.failureCode !== undefined) ||
          (row.safeFailureMessage !== null && row.safeFailureMessage !== undefined)) {
        throw adminReadError('SOURCE_UNAVAILABLE');
      }
      let report = null;
      if (row.status === 'succeeded') {
        const candidate = row.report;
        let snapshot = row.snapshotJson;
        if (typeof snapshot === 'string') {
          try { snapshot = JSON.parse(snapshot); } catch { throw adminReadError('SOURCE_UNAVAILABLE'); }
        }
        const population = snapshot?.population;
        if (!candidate || candidate.generationRunId !== row.reportRunId ||
            typeof candidate.reportId !== 'string' || !UUID_PATTERN.test(candidate.reportId) ||
            !isInstant(candidate.createdAt) || !candidate.periodStart || !candidate.periodEnd ||
            !population || !Number.isSafeInteger(population.currentSubmissionCount) || population.currentSubmissionCount < 0 ||
            !Number.isSafeInteger(population.currentCommentCount) || population.currentCommentCount < 0)
          throw adminReadError('SOURCE_UNAVAILABLE');
        report = {
          reportId: candidate.reportId,
          createdAt: candidate.createdAt,
          periodStart: candidate.periodStart,
          periodEnd: candidate.periodEnd,
          analyzedResponseCount: population.currentSubmissionCount,
          analyzedCommentCount: population.currentCommentCount,
        };
      } else if (row.report !== null && row.report !== undefined) {
        throw adminReadError('SOURCE_UNAVAILABLE');
      }
      const retryOfReportRunId = row.retryOfGeneration?.reportRunId ?? null;
      if (retryOfReportRunId !== null && (typeof retryOfReportRunId !== 'string' || !UUID_PATTERN.test(retryOfReportRunId)))
        throw adminReadError('SOURCE_UNAVAILABLE');
      return {
        reportRunId: row.reportRunId,
        periodStart: row.periodStart,
        periodEnd: row.periodEnd,
        dataCutoffAt: row.dataCutoffAt,
        status: row.status,
        createdAt: row.createdAt,
        completedAt: row.completedAt ?? null,
        failureCode,
        safeFailureMessage,
        retryOfReportRunId,
        report,
      };
    });
    const last = rows[Math.min(rows.length, PAGE_SIZE) - 1];
    const nextCursor = hasMore && last
      ? encodeCursor(query, { createdAt: new Date(last.createdAt).toISOString(), reportRunId: last.reportRunId })
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
    if (error.code === 'SOURCE_UNAVAILABLE') throw error;
    throw adminReadError('SOURCE_UNAVAILABLE');
  }
}

module.exports = { createPrivateFeedbackAdminReader, validateQuery };
