'use strict';

function prepareQrStatus(point, qrPointStatus, now) {
  if (!['active', 'inactive'].includes(qrPointStatus)) {
    throw Object.assign(new Error('INVALID_QR_STATUS'), { code: 'INVALID_QR_STATUS' });
  }
  if (!point.pointKey || !point.publicCode) {
    throw Object.assign(new Error('QR_IDENTITY_REQUIRED'), { code: 'QR_IDENTITY_REQUIRED' });
  }
  return Object.freeze({
    inactiveAt: qrPointStatus === 'inactive' ? now : null,
    qrPointStatus,
  });
}

module.exports = { prepareQrStatus };
