import { createServer } from "node:http";

const port = Number(process.env.E2E_FIXTURE_PORT ?? 4100);
const timestamp = "2026-01-01T00:00:00.000Z";

const componentTranslation = {
  id: 1,
  documentId: "e2e-component-translation",
  createdAt: timestamp,
  updatedAt: timestamp,
  publishedAt: timestamp,
  locale: "es-AR",
  jsonValue: {
    contact: { direction: "", title: "" },
    items: [],
    menuitems: { contact: "", faqs: "", jobs: "", policies: "" },
    socialitems: { fb: "Facebook", ig: "Instagram", tt: "YouTube" },
    title: "",
  },
};

const serviceState = {
  id: 1,
  documentId: "e2e-service-state",
  createdAt: timestamp,
  updatedAt: timestamp,
  publishedAt: timestamp,
  locale: null,
  state: "normal",
};

function json(response, status, body) {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}

const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://127.0.0.1:${port}`);

  if (url.pathname === "/health") {
    response.writeHead(204);
    response.end();
    return;
  }

  if (request.method !== "GET") {
    json(response, 405, { error: { message: "Method not allowed" } });
    return;
  }

  if (url.pathname === "/api/component-translations") {
    json(response, 200, { data: [componentTranslation], meta: {} });
    return;
  }

  if (url.pathname === "/api/pages") {
    json(response, 200, { data: [], meta: {} });
    return;
  }

  if (url.pathname === "/api/service-state") {
    json(response, 200, { data: serviceState, meta: {} });
    return;
  }

  json(response, 404, { error: { message: "Fixture route not found" } });
});

server.listen(port, "127.0.0.1");

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
