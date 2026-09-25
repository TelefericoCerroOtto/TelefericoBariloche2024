import "server-only";

import { normalizePeriod } from "../../../packages/survey-reporting-core/src";
import type { Locale } from "../../../packages/survey-reporting-core/src/contracts";
import { materializeGenerationInputsV1 } from "./generation-inputs";
import type { MaterializeGenerationInputsV1 } from "./generation-inputs";

export type GenerationSourceResourceV1 = "submissions" | "versions" | "points";

export type GenerationSourcePageQueryV1 = {
  readonly resource: GenerationSourceResourceV1;
  readonly cursor: string | null;
  readonly acceptedAtGte: string;
  readonly acceptedAtLte: string;
  // Bind the frozen snapshot cutoff; do not use it to filter source rows.
  readonly dataCutoffAt: string;
};

export type GenerationSourcePageV1 = {
  readonly cursor: string | null;
  readonly nextCursor: string | null;
  readonly total: number;
  readonly items: readonly unknown[];
};

export type AuthoritativeGenerationSourceInputV1 = Omit<
  MaterializeGenerationInputsV1,
  "snapshot"
> & {
  readonly range: { readonly from: string; readonly to: string };
  readonly dataCutoffAt: string;
  readonly sourceRevision: string;
  readonly readPage: (
    query: GenerationSourcePageQueryV1,
  ) => Promise<unknown>;
};

type RecordValue = Record<string, unknown>;
type SourceSubmission = NonNullable<
  MaterializeGenerationInputsV1["snapshot"]["submissions"][number]
>;

const DIGEST_PATTERN = /^[a-f0-9]{64}$/;
const KEY_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const RESOURCE_ORDER: readonly GenerationSourceResourceV1[] = [
  "submissions",
  "versions",
  "points",
];

function invalidSource(): never {
  throw new TypeError("INVALID_GENERATION_SOURCE");
}

function isRecord(value: unknown): value is RecordValue {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isInstant(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/.test(
      value,
    ) ||
    !Number.isFinite(Date.parse(value))
  )
    return false;
  const date = value.slice(0, 10);
  return new Date(`${date}T00:00:00.000Z`).toISOString().slice(0, 10) === date;
}

function unwrapEntity(value: unknown): RecordValue {
  if (!isRecord(value)) return invalidSource();
  if (Object.hasOwn(value, "data")) {
    if (!isRecord(value.data)) return invalidSource();
    if (!isRecord(value.data.attributes)) return invalidSource();
    return { ...value.data.attributes, id: value.data.documentId ?? value.data.id };
  }
  if (isRecord(value.attributes)) {
    return { ...value.attributes, id: value.documentId ?? value.id };
  }
  return value;
}

function rowsFromRelation(value: unknown): readonly unknown[] {
  if (Array.isArray(value)) return value;
  if (isRecord(value) && Array.isArray(value.data)) return value.data;
  return invalidSource();
}

function relatedEntity(value: unknown): RecordValue {
  if (!isRecord(value)) return invalidSource();
  if (Object.hasOwn(value, "data")) {
    if (!isRecord(value.data) || !isRecord(value.data.attributes))
      return invalidSource();
    return {
      ...value.data.attributes,
      documentId: value.data.documentId,
      id: value.data.id,
    };
  }
  if (isRecord(value.attributes)) {
    return {
      ...value.attributes,
      documentId: value.documentId,
      id: value.id,
    };
  }
  return value;
}

function entityIdentity(value: RecordValue): string {
  const id = value.documentId ?? value.id;
  if (
    typeof id !== "string" &&
    !(typeof id === "number" && Number.isSafeInteger(id) && id >= 0)
  )
    return invalidSource();
  if (typeof id === "string" && !nonEmptyString(id)) return invalidSource();
  return String(id);
}

async function readCompleteCollection(
  resource: GenerationSourceResourceV1,
  input: AuthoritativeGenerationSourceInputV1,
  acceptedAtGte: string,
  acceptedAtLte: string,
): Promise<readonly RecordValue[]> {
  const items: RecordValue[] = [];
  const requestedCursors = new Set<string>();
  let cursor: string | null = null;
  let expectedTotal: number | null = null;

  while (true) {
    const cursorKey = cursor ?? "<initial>";
    if (requestedCursors.has(cursorKey)) return invalidSource();
    requestedCursors.add(cursorKey);

    let rawPage: unknown;
    try {
      rawPage = await input.readPage({
        resource,
        cursor,
        acceptedAtGte,
        acceptedAtLte,
        dataCutoffAt: input.dataCutoffAt,
      });
    } catch {
      return invalidSource();
    }

    if (
      !isRecord(rawPage) ||
      rawPage.cursor !== cursor ||
      !Array.isArray(rawPage.items) ||
      !Number.isSafeInteger(rawPage.total) ||
      (rawPage.total as number) < 0 ||
      (rawPage.nextCursor !== null &&
        (typeof rawPage.nextCursor !== "string" ||
          rawPage.nextCursor.length === 0))
    )
      return invalidSource();

    const total = rawPage.total as number;
    if (expectedTotal === null) expectedTotal = total;
    if (total !== expectedTotal) return invalidSource();

    const pageRows = rawPage.items.map((item) => {
      try {
        return unwrapEntity(item);
      } catch {
        return invalidSource();
      }
    });
    items.push(...pageRows);
    if (items.length > total) return invalidSource();

    const nextCursor = rawPage.nextCursor as string | null;
    if (nextCursor === null) {
      if (items.length !== total) return invalidSource();
      return items;
    }
    if (nextCursor === cursor || requestedCursors.has(nextCursor))
      return invalidSource();
    if (pageRows.length === 0 || items.length >= total) return invalidSource();
    cursor = nextCursor;
  }
}

function parsePoint(value: RecordValue) {
  const pointKey = value.pointKey;
  const displayName = value.displayName;
  const sortOrder = value.sortOrder;
  if (
    !nonEmptyString(pointKey) ||
    !KEY_PATTERN.test(pointKey) ||
    !nonEmptyString(displayName) ||
    !Number.isSafeInteger(sortOrder) ||
    (sortOrder as number) < 0
  )
    return invalidSource();
  return {
    sourceRowId: entityIdentity(value),
    pointKey,
    displayName,
    sortOrder: sortOrder as number,
  };
}

function parseVersion(value: RecordValue) {
  const versionKey = value.versionKey;
  if (!nonEmptyString(versionKey) || !KEY_PATTERN.test(versionKey))
    return invalidSource();

  const definitions = new Map<string, { aspectKey: string; sortOrder: number }>();
  const seenOrders = new Set<number>();
  for (const rawAspect of rowsFromRelation(value.aspects)) {
    const aspect = unwrapEntity(rawAspect);
    const aspectKey = aspect.aspectKey;
    const sortOrder = aspect.sortOrder;
    if (
      !nonEmptyString(aspectKey) ||
      !KEY_PATTERN.test(aspectKey) ||
      !Number.isSafeInteger(sortOrder) ||
      (sortOrder as number) < 0 ||
      definitions.has(aspectKey) ||
      seenOrders.has(sortOrder as number)
    )
      return invalidSource();
    definitions.set(aspectKey, { aspectKey, sortOrder: sortOrder as number });
    seenOrders.add(sortOrder as number);
  }
  if (definitions.size === 0) return invalidSource();
  return { sourceRowId: entityIdentity(value), versionKey, definitions };
}

function parseSubmission(
  value: RecordValue,
  versions: ReadonlyMap<
    string,
    { readonly sourceRowId: string; readonly definitions: Map<string, { aspectKey: string; sortOrder: number }> }
  >,
  pointRowIdsByKey: ReadonlyMap<string, string>,
  acceptedAtGte: string,
  acceptedAtLte: string,
): SourceSubmission {
  const recordId = entityIdentity(value);
  const receipt = value.receipt;
  const acceptedAt = value.acceptedAt;
  const locale = value.locale;
  const overallRating = value.overallRating;
  const source = value.source;
  const comment = value.comment;
  const payloadDigest = value.payloadDigest;
  if (
    !nonEmptyString(receipt) ||
    !isInstant(acceptedAt) ||
    Date.parse(acceptedAt) < Date.parse(acceptedAtGte) ||
    Date.parse(acceptedAt) > Date.parse(acceptedAtLte) ||
    !["es", "en", "pt"].includes(String(locale)) ||
    !Number.isSafeInteger(overallRating) ||
    (overallRating as number) < 1 ||
    (overallRating as number) > 5 ||
    source !== "valid_qr" ||
    !Object.hasOwn(value, "comment") ||
    (comment !== null &&
      (typeof comment !== "string" ||
        comment.trim().length === 0 ||
        comment.length > 2000)) ||
    typeof payloadDigest !== "string" ||
    !DIGEST_PATTERN.test(payloadDigest)
  )
    return invalidSource();

  const point = relatedEntity(value.qrPoint);
  const version = relatedEntity(value.surveyVersion);
  const pointKey = point.pointKey;
  const versionKey = version.versionKey;
  const canonicalPointRowId =
    typeof pointKey === "string" ? pointRowIdsByKey.get(pointKey) : undefined;
  const canonicalVersion =
    typeof versionKey === "string" ? versions.get(versionKey) : undefined;
  if (
    !nonEmptyString(pointKey) ||
    !canonicalPointRowId ||
    entityIdentity(point) !== canonicalPointRowId ||
    !nonEmptyString(versionKey) ||
    !canonicalVersion ||
    entityIdentity(version) !== canonicalVersion.sourceRowId
  )
    return invalidSource();

  const aspectRows = rowsFromRelation(value.ratings);
  if (aspectRows.length < 1 || aspectRows.length > 3)
    return invalidSource();
  const seenAspectKeys = new Set<string>();
  const aspects = aspectRows.map((rawAspect) => {
    const aspect = unwrapEntity(rawAspect);
    const aspectKey = aspect.aspectKey;
    const label = aspect.label;
    const sortOrder = aspect.sortOrder;
    const sentiment = aspect.rating;
    const definition = canonicalVersion.definitions.get(String(aspectKey));
    if (
      !nonEmptyString(aspectKey) ||
      !nonEmptyString(label) ||
      !Number.isSafeInteger(sortOrder) ||
      (sortOrder as number) < 0 ||
      !["positive", "neutral", "negative"].includes(String(sentiment)) ||
      seenAspectKeys.has(aspectKey) ||
      !definition ||
      definition.sortOrder !== sortOrder
    )
      return invalidSource();

    seenAspectKeys.add(aspectKey);
    const customText = aspect.customText;
    if (
      aspectKey === "other" &&
      (typeof customText !== "string" ||
        customText.trim().length === 0 ||
        customText.length > 300)
    )
      return invalidSource();
    if (
      aspectKey !== "other" &&
      customText !== undefined &&
      customText !== null
    )
      return invalidSource();

    return {
      aspectKey,
      label,
      sortOrder: sortOrder as number,
      sentiment: sentiment as "positive" | "neutral" | "negative",
      ...(typeof customText === "string" ? { customText } : {}),
    };
  });

  return {
    recordId,
    receipt,
    acceptedAt,
    source,
    locale: locale as Locale,
    versionKey,
    pointKey,
    overallRating: overallRating as 1 | 2 | 3 | 4 | 5,
    commentText: comment,
    aspects,
    payloadDigest,
  };
}

function assertUnique<T>(
  rows: readonly T[],
  identity: (row: T) => string,
): void {
  const identities = new Set<string>();
  for (const row of rows) {
    const key = identity(row);
    if (identities.has(key)) invalidSource();
    identities.add(key);
  }
}

export async function buildAuthoritativeGenerationInputsV1(
  input: AuthoritativeGenerationSourceInputV1,
) {
  try {
    if (
      !isInstant(input.dataCutoffAt) ||
      new Date(input.dataCutoffAt).toISOString() !== input.dataCutoffAt ||
      !nonEmptyString(input.sourceRevision) ||
      typeof input.readPage !== "function"
    )
      return invalidSource();

    const period = normalizePeriod(input.range);
    const acceptedAtGte = period.previous.utcStart;
    const acceptedAtLte = period.current.utcEnd;
    const collections = await Promise.all(
      RESOURCE_ORDER.map((resource) =>
        readCompleteCollection(resource, input, acceptedAtGte, acceptedAtLte),
      ),
    );
    const [submissionRows, versionRows, pointRows] = collections;
    if (versionRows.length === 0 || pointRows.length === 0) return invalidSource();
    const parsedVersions = versionRows.map(parseVersion);
    const parsedPoints = pointRows.map(parsePoint);
    assertUnique(parsedVersions, ({ versionKey }) => versionKey);
    assertUnique(parsedPoints, ({ pointKey }) => pointKey);
    assertUnique(versionRows, entityIdentity);
    assertUnique(pointRows, entityIdentity);
    const versionByKey = new Map(
      parsedVersions.map(({ sourceRowId, versionKey, definitions }) => [
        versionKey,
        { sourceRowId, definitions },
      ]),
    );
    const pointRowIdsByKey = new Map(
      parsedPoints.map(({ sourceRowId, pointKey }) => [pointKey, sourceRowId]),
    );
    const points = parsedPoints.map(
      ({ sourceRowId: _sourceRowId, ...point }) => point,
    );

    const definitionsByKey = new Map<
      string,
      { aspectKey: string; sortOrder: number }
    >();
    for (const version of parsedVersions) {
      for (const definition of version.definitions.values()) {
        const previous = definitionsByKey.get(definition.aspectKey);
        if (!previous || definition.sortOrder < previous.sortOrder)
          definitionsByKey.set(definition.aspectKey, definition);
      }
    }

    const submissions = submissionRows.map((row) =>
      parseSubmission(
        row,
        versionByKey,
        pointRowIdsByKey,
        acceptedAtGte,
        acceptedAtLte,
      ),
    );
    assertUnique(submissions, ({ recordId }) => recordId);
    assertUnique(submissions, ({ receipt }) => receipt);
    assertUnique(submissionRows, entityIdentity);

    return materializeGenerationInputsV1({
      snapshot: {
        sourceRevision: input.sourceRevision,
        createdAt: input.dataCutoffAt,
        dataCutoffAt: input.dataCutoffAt,
        range: input.range,
        filters: { pointKey: null, versionKey: null },
        submissions,
        definitions: [...definitionsByKey.values()].sort(
          (left, right) =>
            left.sortOrder - right.sortOrder ||
            (left.aspectKey < right.aspectKey
              ? -1
              : left.aspectKey > right.aspectKey
                ? 1
                : 0),
        ),
        points,
      },
      modelConfig: input.modelConfig,
      pricingSnapshot: input.pricingSnapshot,
      evidenceKeyId: input.evidenceKeyId,
    });
  } catch {
    return invalidSource();
  }
}
