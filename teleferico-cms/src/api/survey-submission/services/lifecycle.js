'use strict';

const SENTIMENTS = new Set(['negative', 'neutral', 'positive']);
const LABEL_BY_LOCALE = Object.freeze({ en: 'labelEn', es: 'labelEs', pt: 'labelPt' });

function domainError(code) {
  return Object.assign(new Error(code), { code });
}

function prepareSubmission(input, context) {
  const selections = [...(input.aspects ?? [])];
  const total = selections.length + (input.otherAspect ? 1 : 0);
  if (total < 1 || total > 3) throw domainError('INVALID_SELECTION_COUNT');
  if (!LABEL_BY_LOCALE[input.locale] || !Number.isInteger(input.overallRating) ||
      input.overallRating < 1 || input.overallRating > 5) {
    throw domainError('INVALID_ANSWERS');
  }

  const definitions = new Map(context.version.aspects.map((aspect) => [aspect.aspectKey, aspect]));
  const keys = new Set();
  const ratings = selections.map((selection) => {
    if (selection.aspectKey === 'other' || keys.has(selection.aspectKey)) {
      throw domainError(selection.aspectKey === 'other' ? 'OTHER_MUST_BE_SEPARATE' : 'DUPLICATE_ASPECT');
    }
    const definition = definitions.get(selection.aspectKey);
    if (!definition || !SENTIMENTS.has(selection.rating)) throw domainError('INVALID_ASPECT');
    keys.add(selection.aspectKey);
    return {
      aspectKey: definition.aspectKey,
      label: definition[LABEL_BY_LOCALE[input.locale]],
      ownerReceipt: context.receipt,
      rating: selection.rating,
      sortOrder: definition.sortOrder,
    };
  });

  if (input.otherAspect) {
    const other = definitions.get('other');
    if (!other || !SENTIMENTS.has(input.otherAspect.rating) ||
        typeof input.otherAspect.customText !== 'string' || !input.otherAspect.customText.trim()) {
      throw domainError('INVALID_OTHER_ASPECT');
    }
    ratings.push({
      aspectKey: 'other',
      customText: input.otherAspect.customText.trim(),
      label: other[LABEL_BY_LOCALE[input.locale]],
      ownerReceipt: context.receipt,
      rating: input.otherAspect.rating,
      sortOrder: other.sortOrder,
    });
  }

  return Object.freeze({
    acceptedAt: context.acceptedAt,
    browserTokenHash: context.browserTokenHash,
    comment: input.comment,
    idempotencyKey: context.idempotencyKey,
    locale: input.locale,
    overallRating: input.overallRating,
    payloadDigest: context.payloadDigest,
    qrPoint: context.qrPointDocumentId,
    ratings,
    receipt: context.receipt,
    sessionNonceHash: context.sessionNonceHash,
    source: 'valid_qr',
    surveyVersion: context.surveyVersionDocumentId,
  });
}

module.exports = { prepareSubmission };
