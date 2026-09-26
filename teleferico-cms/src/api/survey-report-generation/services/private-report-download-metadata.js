'use strict';

const REPORT_UID = 'api::survey-report.survey-report';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const REPORT_OBJECT_KEY = (reportId) => `private/feedback-reports/${reportId}/report.pdf`;
const MAX_PDF_BYTES = 25 * 1024 * 1024;

function metadataError(code) {
  return Object.assign(new Error(code), { code });
}

function createPrivateReportDownloadMetadataReader(strapi) {
  return Object.freeze({
    async read(reportId) {
      if (typeof reportId !== 'string' || !UUID_PATTERN.test(reportId))
        throw metadataError('VALIDATION_FAILED');

      let report;
      try {
        report = await strapi.db.query(REPORT_UID).findOne({
          where: { reportId },
          fields: ['reportId', 'generationRunId', 'objectKey', 'artifactSha256', 'artifactSize', 'mimeType'],
          populate: {
            sourceGeneration: { fields: ['reportRunId', 'status'] },
          },
        });
      } catch {
        throw metadataError('REPORT_UNAVAILABLE');
      }

      if (!report) throw metadataError('NOT_FOUND');
      const generation = report.sourceGeneration;
      const size = Number(report.artifactSize);
      if (
        report.reportId !== reportId ||
        typeof report.generationRunId !== 'string' ||
        !UUID_PATTERN.test(report.generationRunId) ||
        !generation ||
        generation.reportRunId !== report.generationRunId ||
        generation.status !== 'succeeded' ||
        report.objectKey !== REPORT_OBJECT_KEY(reportId) ||
        !/^[a-f0-9]{64}$/.test(report.artifactSha256) ||
        !Number.isSafeInteger(size) || size < 1 || size > MAX_PDF_BYTES ||
        report.mimeType !== 'application/pdf'
      )
        throw metadataError('REPORT_UNAVAILABLE');

      return {
        contractVersion: 'survey-report-download-metadata.v1',
        reportId,
        reportRunId: report.generationRunId,
        generationStatus: 'succeeded',
        objectKey: report.objectKey,
        sha256: report.artifactSha256,
        size,
        mimeType: 'application/pdf',
      };
    },
  });
}

module.exports = { createPrivateReportDownloadMetadataReader, MAX_PDF_BYTES };
