FROM --platform=linux/amd64 node@sha256:ea11b74b986d520137cdef9a5346e447a00f275ecc4abc0055b7151226231e09

WORKDIR /workspace/teleferico-cms

COPY teleferico-cms/package.json teleferico-cms/package-lock.json ./
RUN npm ci

COPY teleferico-cms/ ./
COPY packages/tb113-runtime-contracts /workspace/packages/tb113-runtime-contracts
RUN npm run build

EXPOSE 1337

CMD ["npm", "run", "start"]
