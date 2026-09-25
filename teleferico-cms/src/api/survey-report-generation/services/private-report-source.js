'use strict';

const MAX_PAGE_SIZE = 25;
const MAX_WINDOW_MILLISECONDS = 732 * 24 * 60 * 60 * 1000;
const CURSOR_KEYS = [
  'version',
  'resource',
  'acceptedAtGte',
  'acceptedAtLte',
  'dataCutoffAt',
  'after',
];
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function sourceError(code) {
  return Object.assign(new Error(code), { code });
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function exactKeys(value, keys) {
  return isRecord(value) && Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function isCanonicalInstant(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

function validateQuery(query) {
  const keys = ['contractVersion', 'resource', 'acceptedAtGte', 'acceptedAtLte', 'dataCutoffAt', 'cursor', 'pageSize'];
  if (!exactKeys(query, keys) || query.contractVersion !== 'survey-generation-source.v1' ||
      !['submissions', 'versions', 'points'].includes(query.resource) ||
      !isCanonicalInstant(query.acceptedAtGte) || !isCanonicalInstant(query.acceptedAtLte) ||
      !isCanonicalInstant(query.dataCutoffAt) || Date.parse(query.acceptedAtLte) < Date.parse(query.acceptedAtGte) ||
      Date.parse(query.acceptedAtLte) - Date.parse(query.acceptedAtGte) > MAX_WINDOW_MILLISECONDS ||
      !Number.isSafeInteger(query.pageSize) || query.pageSize < 1 || query.pageSize > MAX_PAGE_SIZE ||
      (query.cursor !== null && (typeof query.cursor !== 'string' || query.cursor.length > 1024))) {
    throw sourceError('VALIDATION_FAILED');
  }
}

function encodeCursor(cursor) {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

function decodeCursor(cursor, query) {
  if (cursor === null) return null;
  try {
    const decoded = Buffer.from(cursor, 'base64url');
    if (decoded.toString('base64url') !== cursor) throw new Error();
    const value = JSON.parse(decoded.toString('utf8'));
    if (!exactKeys(value, CURSOR_KEYS) || value.version !== 1 || value.resource !== query.resource ||
        value.acceptedAtGte !== query.acceptedAtGte || value.acceptedAtLte !== query.acceptedAtLte ||
        value.dataCutoffAt !== query.dataCutoffAt) throw new Error();
    if (query.resource === 'submissions') {
      if (typeof value.after !== 'string' || !UUID_PATTERN.test(value.after)) throw new Error();
    } else if (typeof value.after !== 'string' || value.after.length === 0 || value.after.length > 128) {
      throw new Error();
    }
    return value.after;
  } catch {
    throw sourceError('VALIDATION_FAILED');
  }
}

function timestamp(value) {
  const result = value instanceof Date ? value.toISOString() : new Date(value).toISOString();
  if (!isCanonicalInstant(result)) throw sourceError('SOURCE_UNAVAILABLE');
  return result;
}

function safeTotal(value) {
  const total = Number(value);
  if (!Number.isSafeInteger(total) || total < 0) throw sourceError('SOURCE_UNAVAILABLE');
  return total;
}

function requireIdentity(value) {
  if (typeof value !== 'string' || value.length === 0 || value.length > 128) throw sourceError('SOURCE_UNAVAILABLE');
  return value;
}

async function countRows(query, table, filter) {
  let builder = query(table).count({ total: 'id' });
  builder = filter(builder);
  const row = await builder.first();
  return safeTotal(row?.total);
}

function bindWindow(builder, query, column) {
  return builder.whereBetween(column, [query.acceptedAtGte, query.acceptedAtLte]);
}

async function readSubmissionPage(db, query, after) {
  const filter = (builder) => bindWindow(builder.where('submission.source', 'valid_qr'), query, 'submission.accepted_at');
  const total = await countRows(db, { submission: 'survey_submissions' }, filter);
  let rows = db({ submission: 'survey_submissions' })
    .leftJoin({ pointLink: 'survey_submissions_qr_point_lnk' }, 'pointLink.survey_submission_id', 'submission.id')
    .leftJoin({ point: 'survey_qr_points' }, 'point.id', 'pointLink.survey_qr_point_id')
    .leftJoin({ versionLink: 'survey_submissions_survey_version_lnk' }, 'versionLink.survey_submission_id', 'submission.id')
    .leftJoin({ version: 'survey_versions' }, 'version.id', 'versionLink.survey_version_id')
    .select(
      'submission.id as sourceId', 'submission.document_id as documentId', 'submission.receipt',
      'submission.accepted_at as acceptedAt', 'submission.source', 'submission.locale',
      'submission.overall_rating as overallRating', 'submission.comment', 'submission.payload_digest as payloadDigest',
      'point.id as pointId', 'point.document_id as pointDocumentId', 'point.point_key as pointKey',
      'version.id as versionId', 'version.document_id as versionDocumentId', 'version.version_key as versionKey',
    )
    .where('submission.source', 'valid_qr');
  rows = bindWindow(rows, query, 'submission.accepted_at');
  if (after) rows = rows.where('submission.receipt', '>', after);
  rows = await rows.orderBy('submission.receipt', 'asc').limit(query.pageSize + 1);
  const hasMore = rows.length > query.pageSize;
  const pageRows = rows.slice(0, query.pageSize);
  const ids = pageRows.map(({ sourceId }) => sourceId);
  const ratingRows = ids.length === 0 ? [] : await db({ componentLink: 'survey_submissions_cmps' })
    .innerJoin({ rating: 'components_survey_aspect_ratings' }, 'rating.id', 'componentLink.cmp_id')
    .select(
      'componentLink.entity_id as submissionId', 'rating.aspect_key as aspectKey', 'rating.label',
      'rating.sort_order as sortOrder', 'rating.rating', 'rating.custom_text as customText', 'rating.id as ratingId',
    )
    .whereIn('componentLink.entity_id', ids)
    .andWhere('componentLink.field', 'ratings')
    .andWhere('componentLink.component_type', 'survey.aspect-rating')
    .orderBy('componentLink.entity_id', 'asc').orderBy('componentLink.order', 'asc');
  const ratingsBySubmission = new Map(ids.map((id) => [id, []]));
  for (const row of ratingRows) {
    const ratings = ratingsBySubmission.get(row.submissionId);
    if (!ratings) throw sourceError('SOURCE_UNAVAILABLE');
    ratings.push({
      id: requireIdentity(String(row.ratingId)),
      aspectKey: row.aspectKey,
      label: row.label,
      sortOrder: Number(row.sortOrder),
      rating: row.rating,
      ...(row.customText === null ? {} : { customText: row.customText }),
    });
  }
  const items = pageRows.map((row) => {
    const ratings = ratingsBySubmission.get(row.sourceId);
    if (!row.documentId || !row.pointDocumentId || !row.versionDocumentId || !Array.isArray(ratings) || ratings.length < 1 || ratings.length > 3) {
      throw sourceError('SOURCE_UNAVAILABLE');
    }
    return {
      documentId: requireIdentity(row.documentId),
      receipt: row.receipt,
      acceptedAt: timestamp(row.acceptedAt),
      source: row.source,
      locale: row.locale,
      overallRating: Number(row.overallRating),
      comment: row.comment,
      payloadDigest: row.payloadDigest,
      qrPoint: { id: requireIdentity(String(row.pointId)), documentId: requireIdentity(row.pointDocumentId), pointKey: row.pointKey },
      surveyVersion: { id: requireIdentity(String(row.versionId)), documentId: requireIdentity(row.versionDocumentId), versionKey: row.versionKey },
      ratings,
    };
  });
  const last = pageRows.at(-1);
  return {
    total,
    items,
    after: hasMore && last ? last.receipt : null,
  };
}

async function readVersionPage(db, query, after) {
  const total = await countRows(db, 'survey_versions', (builder) => builder);
  let rows = db('survey_versions').select('id', 'document_id as documentId', 'version_key as versionKey');
  if (after) rows = rows.where('document_id', '>', after);
  rows = await rows.orderBy('document_id', 'asc').limit(query.pageSize + 1);
  const hasMore = rows.length > query.pageSize;
  const pageRows = rows.slice(0, query.pageSize);
  const ids = pageRows.map(({ id }) => id);
  const aspects = ids.length === 0 ? [] : await db({ versionLink: 'survey_versions_cmps' })
    .innerJoin({ aspect: 'components_survey_aspect_definitions' }, 'aspect.id', 'versionLink.cmp_id')
    .select('versionLink.entity_id as versionId', 'aspect.id as aspectId', 'aspect.aspect_key as aspectKey', 'aspect.sort_order as sortOrder')
    .whereIn('versionLink.entity_id', ids)
    .andWhere('versionLink.field', 'aspects')
    .andWhere('versionLink.component_type', 'survey.aspect-definition')
    .orderBy('versionLink.entity_id', 'asc').orderBy('versionLink.order', 'asc');
  const aspectsByVersion = new Map(ids.map((id) => [id, []]));
  for (const row of aspects) aspectsByVersion.get(row.versionId)?.push({
    id: requireIdentity(String(row.aspectId)),
    aspectKey: row.aspectKey,
    sortOrder: Number(row.sortOrder),
  });
  const items = pageRows.map((row) => {
    const definitions = aspectsByVersion.get(row.id);
    if (!row.documentId || !row.versionKey || !definitions || definitions.length === 0) throw sourceError('SOURCE_UNAVAILABLE');
    return { id: requireIdentity(String(row.id)), documentId: requireIdentity(row.documentId), versionKey: row.versionKey, aspects: definitions };
  });
  const last = pageRows.at(-1);
  return { total, items, after: hasMore && last ? requireIdentity(last.documentId) : null };
}

async function readPointPage(db, query, after) {
  const total = await countRows(db, 'survey_qr_points', (builder) => builder);
  let rows = db('survey_qr_points').select('id', 'document_id as documentId', 'point_key as pointKey', 'display_name as displayName', 'sort_order as sortOrder');
  if (after) rows = rows.where('document_id', '>', after);
  rows = await rows.orderBy('document_id', 'asc').limit(query.pageSize + 1);
  const hasMore = rows.length > query.pageSize;
  const pageRows = rows.slice(0, query.pageSize);
  const items = pageRows.map((row) => {
    if (!row.documentId || !row.pointKey || typeof row.displayName !== 'string' || !Number.isSafeInteger(Number(row.sortOrder))) {
      throw sourceError('SOURCE_UNAVAILABLE');
    }
    return {
      id: requireIdentity(String(row.id)),
      documentId: requireIdentity(row.documentId),
      pointKey: row.pointKey,
      displayName: row.displayName,
      sortOrder: Number(row.sortOrder),
    };
  });
  const last = pageRows.at(-1);
  return { total, items, after: hasMore && last ? requireIdentity(last.documentId) : null };
}

function createPrivateReportSourceReader(strapi) {
  return Object.freeze({
    async readPage(query) {
      validateQuery(query);
      const after = decodeCursor(query.cursor, query);
      try {
        const db = strapi.db.connection;
        const result = query.resource === 'submissions'
          ? await readSubmissionPage(db, query, after)
          : query.resource === 'versions'
            ? await readVersionPage(db, query, after)
            : await readPointPage(db, query, after);
        return {
          contractVersion: query.contractVersion,
          resource: query.resource,
          cursor: query.cursor,
          nextCursor: result.after === null ? null : encodeCursor({
            version: 1,
            resource: query.resource,
            acceptedAtGte: query.acceptedAtGte,
            acceptedAtLte: query.acceptedAtLte,
            dataCutoffAt: query.dataCutoffAt,
            after: result.after,
          }),
          total: result.total,
          items: result.items,
        };
      } catch (error) {
        if (error.code === 'SOURCE_UNAVAILABLE') throw error;
        throw sourceError('SOURCE_UNAVAILABLE');
      }
    },
  });
}

module.exports = { createPrivateReportSourceReader, validateQuery };
