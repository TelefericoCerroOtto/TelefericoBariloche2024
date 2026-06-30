const path = require("path");

module.exports = ({ env }) => ({
  upload: {
    config: {
      provider: path.resolve(__dirname, "../../../src/providers/gcs-upload"),
      providerOptions: {
        bucketName: env("GCS_BUCKET_NAME"),
        basePath: env("GCS_BASE_PATH", "public/cms"),
        baseUrl: env(
          "GCS_BASE_URL",
          `https://storage.googleapis.com/${env("GCS_BUCKET_NAME")}`,
        ),
        publicFiles: env.bool("GCS_PUBLIC_FILES", true),
        uniform: env.bool("GCS_UNIFORM", true),
      },
    },
  },
});
