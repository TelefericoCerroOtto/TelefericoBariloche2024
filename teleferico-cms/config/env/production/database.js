module.exports = ({ env }) => ({
  connection: {
    client: env("DATABASE_CLIENT"),
    connection: {
      host: `/cloudsql/${env("INSTANCE_CONNECTION_NAME")}`,
    },
  },
});
