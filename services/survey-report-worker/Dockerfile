FROM --platform=linux/amd64 node@sha256:7cc56ef285a8568121537d17b05e72128f01b89c54607b51acf084a50ef483f3

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
