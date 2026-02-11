module.exports = ({ env }) => ({
  connection: {
    host: `/cloudsql/${env("DATABASE_HOST")}`,
  },
});
