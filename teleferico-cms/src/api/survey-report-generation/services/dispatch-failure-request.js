'use strict';

function measureDispatchFailureRequestBody(request) {
  const rawBody = request.rawBody;
  if (Buffer.isBuffer(rawBody) || rawBody instanceof Uint8Array) return rawBody.byteLength;

  const headers = request.headers ?? {};
  if (headers['transfer-encoding'] !== undefined) return null;
  const contentLength = headers['content-length'];
  if (typeof contentLength !== 'string' || !/^(?:0|[1-9]\d*)$/.test(contentLength)) return null;
  const byteLength = Number(contentLength);
  return Number.isSafeInteger(byteLength) ? byteLength : null;
}

module.exports = { measureDispatchFailureRequestBody };
