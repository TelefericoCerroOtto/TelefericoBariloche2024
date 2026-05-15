# CV storage

This module keeps job-application files out of the Strapi Upload API.

## Why it exists

- CVs are handled as a separate storage concern from CMS images.
- The app needs a private, server-controlled flow for postulation files.
- Routing CV uploads through Strapi Upload would force extra filtering logic to decide which bucket/subfolder to use, and it would also make Media Library handling more complex than the current dedicated flow.

## Current flow

1. `POST /api/postulation` receives the resume file.
2. `createCvStorage()` stores it locally or in GCS under `private/job-applications/...`.
3. Strapi receives only the object metadata (`cvObjectKey`, `cvMimeType`, etc.).
4. `GET /api/admin/postulations/[documentId]/cv` streams the file back through the app server.

## Pending work

- Move the CV bucket to private access if it is still public.
- Review Cloud Run service-account permissions for direct bucket reads.
- Reconfirm the download route still works with private-bucket access.
- Revisit any cache / headers assumptions after the bucket switch.
