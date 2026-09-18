'use strict';

const PUBLIC_COPY_KEYS = Object.freeze([
  'headerTitle', 'localeLabel', 'progressLabel', 'overallQuestion', 'overallInstruction',
  'aspectsQuestion', 'aspectsInstruction', 'otherLabel', 'sentimentQuestion',
  'sentimentInstruction', 'commentQuestion', 'commentInstruction', 'commentLabel',
  'personalDataWarning', 'verificationTitle', 'verificationInstruction', 'privacyNotice',
  'backLabel', 'nextLabel', 'submitLabel', 'loadingStatus', 'ratingRequired',
  'aspectsRequired', 'otherRequired', 'sentimentsRequired', 'verificationFailed',
  'submittingStatus', 'genericFailure', 'successTitle', 'successMessage', 'receiptLabel',
]);

function domainError(code) {
  return Object.assign(new Error(code), { code });
}

function hasCompleteCopy(copy) {
  return copy && Object.keys(copy).length === PUBLIC_COPY_KEYS.length &&
    PUBLIC_COPY_KEYS.every((key) => typeof copy[key] === 'string' && copy[key].length > 0);
}

function validateAspects(version) {
  const keys = new Set();
  const orders = new Set();

  for (const aspect of version.aspects ?? []) {
    if (aspect.ownerVersionKey !== version.versionKey || keys.has(aspect.aspectKey) || orders.has(aspect.sortOrder)) {
      throw domainError('INVALID_ASPECT_CATALOG');
    }
    keys.add(aspect.aspectKey);
    orders.add(aspect.sortOrder);
  }

  if (keys.size === 0) throw domainError('INVALID_ASPECT_CATALOG');
}

function preparePublish(version, now) {
  if (version.status !== 'draft') throw domainError('PUBLISHED_VERSION_IMMUTABLE');
  if (![version.copyEs, version.copyEn, version.copyPt].every(hasCompleteCopy)) {
    throw domainError('INCOMPLETE_TRANSLATIONS');
  }
  validateAspects(version);
  return Object.freeze({ lifecyclePublishedAt: now, status: 'published' });
}

function prepareActivation(settings, target, previous, now) {
  if (target.status !== 'published') throw domainError('VERSION_NOT_PUBLISHED');
  return Object.freeze({
    previous: previous && previous.documentId !== target.documentId
      ? Object.freeze({ lastSupersededAt: now })
      : null,
    settings: Object.freeze({
      activeSurveyVersion: target.documentId,
      settingsRevision: settings.settingsRevision + 1,
    }),
    target: Object.freeze({ lastActivatedAt: now }),
  });
}

module.exports = { PUBLIC_COPY_KEYS, prepareActivation, preparePublish };
