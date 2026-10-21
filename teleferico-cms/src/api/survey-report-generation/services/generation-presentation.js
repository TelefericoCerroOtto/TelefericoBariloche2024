'use strict';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const UNSAFE_TEXT = /[\p{Cc}\p{Cf}]/u;
const VISUAL_FILLERS = /[\u115f\u1160\u2800\u3164\uffa0]/u;
const VISIBLE_TEXT = /[\p{L}\p{N}\p{P}\p{S}]/u;

function validatePresentationCommand(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      value.contractVersion !== 'feedback-admin.v1') return null;
  if (value.action === 'hide' && Object.keys(value).length === 2)
    return { action: 'hide' };
  if (value.action !== 'rename' || Object.keys(value).length !== 3 ||
      typeof value.displayName !== 'string') return null;
  const displayName = value.displayName.trim().normalize('NFC');
  return displayName.length >= 1 && displayName.length <= 80 && !UNSAFE_TEXT.test(displayName) &&
    !VISUAL_FILLERS.test(displayName) && VISIBLE_TEXT.test(displayName)
    ? { action: 'rename', displayName }
    : null;
}

function presentationError(code) {
  return Object.assign(new Error(code), { code });
}

function createGenerationPresentation(store) {
  return Object.freeze({
    async update(reportRunId, command) {
      if (!UUID.test(reportRunId) || !command ||
          !['rename', 'hide'].includes(command.action)) throw presentationError('VALIDATION_FAILED');
      return store.withTransaction(async (tx) => {
        const row = await tx.lockGeneration(reportRunId);
        if (!row) throw presentationError('RUN_NOT_FOUND');
        if (command.action === 'hide' && row.status !== 'failed')
          throw presentationError('INVALID_STATE');
        if (command.action === 'rename') {
          if (typeof command.displayName !== 'string' ||
              validatePresentationCommand({ contractVersion: 'feedback-admin.v1', ...command })?.displayName !== command.displayName)
            throw presentationError('VALIDATION_FAILED');
          if (row.displayName !== command.displayName)
            await tx.updatePresentation({ displayName: command.displayName });
        } else if (row.historyHidden !== true) {
          await tx.updatePresentation({ historyHidden: true });
        }
        return {
          reportRunId,
          displayName: command.action === 'rename' ? command.displayName : row.displayName ?? null,
          historyHidden: command.action === 'hide' ? true : row.historyHidden === true,
        };
      });
    },
  });
}

module.exports = { createGenerationPresentation, validatePresentationCommand };
