'use strict';

function domainError(code) {
  return Object.assign(new Error(code), { code });
}

function assertReportCreation(generation) {
  if (generation.status !== 'running') throw domainError('INVALID_STATE');
}

function prepareGenerationTransition(generation, expectedStateVersion, status, now) {
  if (generation.stateVersion !== expectedStateVersion) throw domainError('STATE_VERSION_CONFLICT');
  if (['succeeded', 'failed'].includes(generation.status)) throw domainError('TERMINAL_CONFLICT');

  const allowed = generation.status === 'queued'
    ? new Set(['running', 'failed'])
    : new Set(['succeeded', 'failed']);
  if (!allowed.has(status)) throw domainError('INVALID_STATE');

  return Object.freeze({
    status,
    stateVersion: expectedStateVersion + 1,
    ...(status === 'running' ? { claimedAt: now } : { completedAt: now }),
  });
}

module.exports = { assertReportCreation, prepareGenerationTransition };
