module.exports = ({ env }) => ({
  client: env("DATABASE_CLIENT"),
  connection: {
    host: `/cloudsql/${env("DATABASE_HOST")}`,
  },
});
