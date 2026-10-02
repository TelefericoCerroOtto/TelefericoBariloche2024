'use strict';

const NONLOCALIZED_SURVEY_UIDS = new Set([
  'api::survey-version.survey-version',
  'api::survey-submission.survey-submission',
]);

module.exports = (plugin) => {
  const populateBuilderService = plugin.services['populate-builder'];
  if (typeof populateBuilderService !== 'function') {
    throw new Error('Content Manager populate-builder service is unavailable.');
  }

  plugin.services['populate-builder'] = (serviceContext) => {
    const createPopulateBuilder = populateBuilderService(serviceContext);
    if (typeof createPopulateBuilder !== 'function') {
      throw new Error('Content Manager populate-builder factory is unavailable.');
    }

    return (uid) => {
      const builder = createPopulateBuilder(uid);
      if (!NONLOCALIZED_SURVEY_UIDS.has(uid)) return builder;
      if (typeof builder.withPopulateOverride !== 'function' || typeof builder.build !== 'function') {
        throw new Error('Content Manager populate-builder contract is unsupported.');
      }

      const build = builder.build.bind(builder);
      builder.build = (...args) => {
        // Strapi 5.45.1 applies localization overrides before build; this final merge wins.
        builder.withPopulateOverride({ localizations: false });
        return build(...args);
      };
      return builder;
    };
  };

  return plugin;
};
