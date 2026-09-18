'use strict';

function prepareQrStatus(point, status, now) {
  if (!['active', 'inactive'].includes(status)) {
    throw Object.assign(new Error('INVALID_QR_STATUS'), { code: 'INVALID_QR_STATUS' });
  }
  if (!point.pointKey || !point.publicCode) {
    throw Object.assign(new Error('QR_IDENTITY_REQUIRED'), { code: 'QR_IDENTITY_REQUIRED' });
  }
  return Object.freeze({ inactiveAt: status === 'inactive' ? now : null, status });
}

module.exports = { prepareQrStatus };
