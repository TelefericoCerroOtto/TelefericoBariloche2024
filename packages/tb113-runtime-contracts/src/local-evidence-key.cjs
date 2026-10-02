'use strict';

const { createHash } = require('node:crypto');

const DOMAIN = 'tb113-local-synthetic-evidence-key.v1';
const PROJECT_ID = 'teleferico-bariloche-2024';
const KEY_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const SOURCE_REVISION_PATTERN = /^[^\u0000-\u001f\u007f]{1,128}$/;
const SECRET_VERSION_PATTERN = new RegExp(
  `^projects/${PROJECT_ID}/secrets/[a-zA-Z0-9_-]{1,255}/versions/[1-9][0-9]*$`,
);

/**
 * Derives synthetic evidence-key material only for explicitly gated local development.
 * This predictable key is not production security evidence and is only suitable
 * for synthetic local data; production must use the pinned Secret Manager version.
 */
function deriveLocalEvidenceKey(input) {
  if (
    !input ||
    typeof input !== 'object' ||
    Array.isArray(input) ||
    Object.keys(input).length !== 3 ||
    !Object.hasOwn(input, 'evidenceKeyId') ||
    !Object.hasOwn(input, 'sourceRevision') ||
    !Object.hasOwn(input, 'secretVersion') ||
    typeof input.evidenceKeyId !== 'string' ||
    !KEY_ID_PATTERN.test(input.evidenceKeyId) ||
    typeof input.sourceRevision !== 'string' ||
    input.sourceRevision.trim() !== input.sourceRevision ||
    !SOURCE_REVISION_PATTERN.test(input.sourceRevision) ||
    typeof input.secretVersion !== 'string' ||
    !SECRET_VERSION_PATTERN.test(input.secretVersion)
  )
    throw new TypeError('Local evidence-key metadata is invalid');

  const material = JSON.stringify([
    DOMAIN,
    input.evidenceKeyId,
    input.sourceRevision,
    input.secretVersion,
  ]);
  return createHash('sha256').update(material, 'utf8').digest();
}

module.exports = { deriveLocalEvidenceKey };
