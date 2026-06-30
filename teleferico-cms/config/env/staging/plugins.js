module.exports = ({ env }) => ({
  upload: {
    config: {
      provider: "@strapi-community/strapi-provider-upload-google-cloud-storage",
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
