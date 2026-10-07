FROM node:22-bookworm-slim

WORKDIR /workspace/teleferico-cms

COPY teleferico-cms/package.json teleferico-cms/package-lock.json ./
RUN npm ci

COPY teleferico-cms/ ./
COPY packages/tb113-runtime-contracts /workspace/packages/tb113-runtime-contracts
RUN npm run build

EXPOSE 1337

CMD ["npm", "run", "start"]
