function readHost(env) {
  return env('HOST', '0.0.0.0') ?? '0.0.0.0';
}

function readPort(env) {
  const value = typeof env.int === 'function' ? env.int('PORT', 1337) : env('PORT', 1337);
  return Number(value ?? 1337);
}

module.exports = ({ env }) => ({
  host: readHost(env),
  port: readPort(env),
  app: {
    keys: env.array('APP_KEYS'),
  },
  webhooks: {
    populateRelations: env.bool('WEBHOOKS_POPULATE_RELATIONS', false),
  },
});

module.exports.readHost = readHost;
module.exports.readPort = readPort;
