module.exports = ({ env }) => ({
  connection: {
    host: `/cloudsql/${env("INSTANCE_CONNECTION_NAME")}`,
  },
});
