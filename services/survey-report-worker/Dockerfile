FROM --platform=linux/amd64 node@sha256:ea11b74b986d520137cdef9a5346e447a00f275ecc4abc0055b7151226231e09

ENV NODE_ENV=production \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    PORT=8080

WORKDIR /workspace/services/survey-report-worker

COPY services/survey-report-worker/package.json \
     services/survey-report-worker/pnpm-lock.yaml \
     services/survey-report-worker/pnpm-workspace.yaml ./
COPY packages/survey-reporting-core/ /workspace/packages/survey-reporting-core/
COPY packages/tb113-private-report-storage/ /workspace/packages/tb113-private-report-storage/
COPY packages/tb113-runtime-contracts/ /workspace/packages/tb113-runtime-contracts/

RUN corepack enable \
    && corepack prepare pnpm@10.33.0 --activate \
    && pnpm install --prod --frozen-lockfile --ignore-scripts \
    && pnpm exec playwright install-deps chromium

COPY services/survey-report-worker/dist/ ./dist/

USER node
EXPOSE 8080
CMD ["node", "--conditions=react-server", "dist/run-worker.mjs"]
