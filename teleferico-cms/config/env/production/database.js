module.exports = ({ env }) => ({
  connection: {
    connection: {
      host: `/cloudsql/${env("DATABASE_HOST")}`,
    },
  }
});
