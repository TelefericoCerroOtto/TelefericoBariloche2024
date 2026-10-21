'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  createGenerationPresentation,
  validatePresentationCommand,
} = require('../../src/api/survey-report-generation/services/generation-presentation');

const runId = '00000000-0000-4000-8000-000000000117';

function memoryStore(initial) {
  const row = { ...initial };
  const changes = [];
  return {
    row,
    changes,
    withTransaction: async (work) => work({
      lockGeneration: async (id) => id === runId ? { ...row } : null,
      updatePresentation: async (patch) => { Object.assign(row, patch); changes.push(patch); },
    }),
  };
}

test('presentation command accepts only a bounded name or explicit hide operation', () => {
  assert.deepEqual(validatePresentationCommand({ contractVersion: 'feedback-admin.v1', action: 'rename', displayName: '  Informe importante  ' }), { action: 'rename', displayName: 'Informe importante' });
  assert.deepEqual(validatePresentationCommand({ contractVersion: 'feedback-admin.v1', action: 'hide' }), { action: 'hide' });
  for (const value of [
    { contractVersion: 'feedback-admin.v1', action: 'rename', displayName: '' },
    { contractVersion: 'feedback-admin.v1', action: 'rename', displayName: 'X'.repeat(81) },
    { contractVersion: 'feedback-admin.v1', action: 'rename', displayName: 'ok\ninvalid' },
    { contractVersion: 'feedback-admin.v1', action: 'rename', displayName: '\u200B' },
    { contractVersion: 'feedback-admin.v1', action: 'rename', displayName: '\u2800' },
    { contractVersion: 'feedback-admin.v1', action: 'rename', displayName: '\u3164' },
    { contractVersion: 'feedback-admin.v1', action: 'rename', displayName: 'ok', historyHidden: true },
    { contractVersion: 'feedback-admin.v1', action: 'hide', displayName: 'not allowed' },
  ]) assert.equal(validatePresentationCommand(value), null);
});

test('rename changes shared display metadata without changing lifecycle fields', async () => {
  const store = memoryStore({ status: 'succeeded', displayName: null, historyHidden: false, stateVersion: 4 });
  const service = createGenerationPresentation(store);
  assert.deepEqual(await service.update(runId, { action: 'rename', displayName: 'Informe importante' }), {
    reportRunId: runId, displayName: 'Informe importante', historyHidden: false,
  });
  assert.deepEqual(store.changes, [{ displayName: 'Informe importante' }]);
  assert.equal(store.row.stateVersion, 4);
  assert.equal(store.row.status, 'succeeded');
});

test('hiding a failed generation is global and idempotent but never deletes it', async () => {
  const store = memoryStore({ status: 'failed', displayName: null, historyHidden: false, stateVersion: 3 });
  const service = createGenerationPresentation(store);
  assert.equal((await service.update(runId, { action: 'hide' })).historyHidden, true);
  assert.equal((await service.update(runId, { action: 'hide' })).historyHidden, true);
  assert.deepEqual(store.changes, [{ historyHidden: true }]);
  assert.equal(store.row.status, 'failed');
  assert.equal(store.row.stateVersion, 3);
});

test('nonfailed and missing generations cannot be hidden or changed', async () => {
  for (const status of ['queued', 'running', 'succeeded']) {
    const store = memoryStore({ status, historyHidden: false });
    await assert.rejects(createGenerationPresentation(store).update(runId, { action: 'hide' }), (error) => error.code === 'INVALID_STATE');
    assert.equal(store.changes.length, 0);
  }
  const store = memoryStore({ status: 'failed', historyHidden: false });
  await assert.rejects(createGenerationPresentation(store).update('00000000-0000-4000-8000-000000000000', { action: 'hide' }), (error) => error.code === 'RUN_NOT_FOUND');
  assert.equal(store.changes.length, 0);
});
