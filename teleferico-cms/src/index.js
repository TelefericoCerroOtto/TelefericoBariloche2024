'use strict';

const tb113Constraints = require('../database/migrations/2026.09.11T0001-tb113-constraints');

module.exports = {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/*{ strapi }*/) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }) {
    const constraintsApplied = await strapi.db.transaction(({ trx }) =>
      tb113Constraints.up(trx),
    );
    if (!constraintsApplied) {
      throw new Error('TB-113 schema synchronization did not create the required columns');
    }

    /**
     * Patch the GCS upload provider's getSignedUrl to strip query params
     * before computing the GCS object path.
     *
     * Root cause: the community provider does not strip existing query
     * params from file.url before calling bucket.file(path).getSignedUrl().
     * When the URL is already signed (contains ?X-Goog-*), the query string
     * gets URL-encoded into the path, producing a double-encoded URL that
     * GCS cannot resolve (HTTP 404).
     *
     * This patch is applied at bootstrap instead of using a wrapper provider
     * because Strapi's signFileUrls compares file.provider (stored in DB)
     * against config.provider. A wrapper provider changes the config string,
     * causing a mismatch that skips URL signing entirely.
     */
    const provider = strapi.plugins.upload?.provider;
    if (provider?.getSignedUrl) {
      const originalGetSignedUrl = provider.getSignedUrl.bind(provider);
      provider.getSignedUrl = async (file) => {
        if (!file?.url) {
          return originalGetSignedUrl(file);
        }
        const cleanFile = { ...file, url: file.url.split('?')[0] };
        return originalGetSignedUrl(cleanFile);
      };
    }
  },
};
