module.exports = ({ env }) => ({
  connection: {
    client: env("DATABASE_CLIENT"),
    connection: {
      host: `/cloudsql/${env("DATABASE_HOST")}`,
    },
  }
});
