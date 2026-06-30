'use strict';

/**
 * Wrapper around @strapi-community/strapi-provider-upload-google-cloud-storage
 * that fixes a bug in getSignedUrl: the upstream provider does not strip
 * existing query params from file.url before computing the GCS object path.
 * When the URL is already signed (contains ?X-Goog-*), the query string gets
 * URL-encoded into the path, producing a double-encoded URL that GCS cannot
 * resolve (HTTP 404).
 *
 * Root cause: signFileUrls can receive a file whose url field already contains
 * a signed URL from a previous call, and the upstream provider passes it as-is
 * to bucket.file(path).getSignedUrl(), encoding the prior signature as part of
 * the object key.
 *
 * Fix: strip everything after the first '?' before extracting the object key.
 */

const gcsProvider = require('@strapi-community/strapi-provider-upload-google-cloud-storage');

module.exports = {
  init(config) {
    const provider = gcsProvider.init(config);

    return {
      ...provider,

      async getSignedUrl(file) {
        if (!file?.url) {
          return provider.getSignedUrl(file);
        }

        const cleanFile = { ...file, url: file.url.split('?')[0] };
        return provider.getSignedUrl(cleanFile);
      },
    };
  },
};
