import { expect, test, type Page } from "@playwright/test";

const period = { from: "2026-09-01", to: "2026-09-10" };
const population = {
  current: period,
  previous: { from: "2026-08-22", to: "2026-08-31" },
};

function metric(submissionCount: number) {
  return {
    submissionCount,
    averageMilliStars: 4200,
    satisfied: { count: submissionCount - 1, rateBps: 8000 },
    unfavorable: { count: 1, rateBps: 1000 },
    starDistribution: [{ star: 5, count: submissionCount }],
  };
}

const aspect = {
  aspectKey: "views",
  labelVariants: [{ label: "Vistas" }],
  selectionCount: 12,
  evidenceThreshold: 5,
  hasSufficientEvidence: true,
  current: {
    positive: { count: 10 },
    neutral: { count: 1 },
    negative: { count: 1 },
  },
  relatedOverallRating: [
    { sentiment: "positive", averageMilliStars: 4500, submissionCount: 10 },
    { sentiment: "neutral", averageMilliStars: 3000, submissionCount: 1 },
    { sentiment: "negative", averageMilliStars: 2000, submissionCount: 1 },
  ],
  trend: [{ unit: "day", from: period.from, selectionCount: 12 }],
};

const points = [
  {
    pointKey: "summit",
    displayName: "Cumbre",
    current: metric(12),
    previous: metric(8),
  },
  {
    pointKey: "valley",
    displayName: "Base",
    current: metric(6),
    previous: metric(4),
  },
];
const report = {
  reportId: "report-1",
  reportRunId: "run-1",
  name: "Informe de experiencia",
  period,
  status: "succeeded",
  analyzedResponseCount: 18,
  analyzedCommentCount: 4,
  dataCutoffAt: "2026-09-10T23:59:59.000Z",
  createdAt: "2026-09-11T12:00:00.000Z",
  requestedBy: null,
  generatedBy: null,
  canDownload: true,
  artifactSize: 1024,
  artifactSha256: "a".repeat(64),
};

const summary = {
  current: metric(18),
  previous: metric(12),
  deltas: {
    submissionCount: 6,
    submissionPercentBps: 5000,
    averageMilliStars: 300,
    satisfiedRateBps: 500,
    unfavorableRateBps: -200,
  },
  calendar: [
    {
      period: "current",
      unit: "day",
      from: period.from,
      submissionCount: 18,
      satisfactionRateBps: 8000,
    },
  ],
  strengths: ["views"],
  opportunities: [],
  aspects: [aspect],
  availablePoints: points,
  latestSuccessfulReport: report,
};

const aspectsData = {
  current: summary.current,
  previous: summary.previous,
  deltas: summary.deltas,
  aspects: [aspect],
  matrix: [
    {
      aspectKey: "views",
      xSelectionCount: 12,
      yNegativeRateBps: 1000,
      medianSelectionCountTimesTwo: 12,
      medianNegativeRateBpsTimesTwo: 1000,
      state: "classified",
      quadrant: "strength",
    },
  ],
  fiveStarAssociation: [
    {
      aspectKey: "views",
      fiveStarPositiveRateBps: 9000,
      oneToFourPositiveRateBps: 7000,
      differenceBps: 2000,
    },
  ],
  otherAspects: [],
};

const comment = {
  recordId: "comment-1",
  receipt: "receipt-1",
  acceptedAt: "2026-09-08T22:30:00.000Z",
  locale: "es",
  pointKey: "summit",
  overallRating: 5,
  aspectRatings: [{ aspectKey: "views", rating: "positive" }],
  text: "Las vistas fueron excelentes.",
};

type RequestRecord = {
  method: string;
  path: string;
  query: string;
  body: unknown;
};

function createResponseBarrier() {
  let releaseResponse!: () => void;
  let markResponseReached!: () => void;
  const responseReached = new Promise<void>((resolve) => {
    markResponseReached = resolve;
  });
  const responseReleased = new Promise<void>((resolve) => {
    releaseResponse = resolve;
  });
  return {
    responseReached,
    releaseResponse,
    waitForRelease: async () => {
      markResponseReached();
      await responseReleased;
    },
  };
}

function waitForSuccessfulAdminRead(
  page: Page,
  resource: string,
  matchesQuery: (query: URLSearchParams) => boolean = () => true,
) {
  return page
    .waitForResponse((response) => {
      const request = response.request();
      const url = new URL(response.url());
      return (
        request.method() === "GET" &&
        url.pathname === `/api/admin/feedback/${resource}` &&
        matchesQuery(url.searchParams)
      );
    })
    .then((response) => {
      const url = new URL(response.url());
      expect(
        response.ok(),
        `GET ${url.pathname}${url.search} returned HTTP ${response.status()}`,
      ).toBe(true);
    });
}

async function installAdminStack(
  page: Page,
  empty = false,
  summaryBarrier?: ReturnType<typeof createResponseBarrier>,
) {
  const requests: RequestRecord[] = [];
  const browserUrls: string[] = [];
  page.on("request", (request) => browserUrls.push(request.url()));
  await page.route("**/api/admin/feedback/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    let body: unknown = null;
    try {
      body = request.postDataJSON();
    } catch {}
    requests.push({
      method: request.method(),
      path: url.pathname,
      query: url.search,
      body,
    });
    const json = (data: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(data),
      });
    const envelope = (data: unknown) =>
      json({
        contractVersion: "feedback-admin.v1",
        data,
        meta: { filters: { from: period.from, to: period.to }, population },
      });
    if (request.method() === "POST" && url.pathname.endsWith("/generations"))
      return json({ reportRunId: "run-failed", status: "failed" });
    if (request.method() === "POST" && url.pathname.endsWith("/retry"))
      return json({ reportRunId: "run-failed", status: "queued" });
    if (url.pathname.endsWith("/summary")) {
      await summaryBarrier?.waitForRelease();
      return envelope(
        empty
          ? {
              ...summary,
              current: metric(0),
              previous: metric(0),
              aspects: [],
              availablePoints: [],
              strengths: [],
              latestSuccessfulReport: null,
              calendar: [],
            }
          : summary,
      );
    }
    if (url.pathname.endsWith("/aspects")) return envelope(aspectsData);
    if (url.pathname.endsWith("/qr-points"))
      return envelope({
        view: url.searchParams.get("view"),
        points,
        calendar: summary.calendar,
        aspects: [aspect],
      });
    if (url.pathname.endsWith("/comments"))
      return envelope({
        items: empty ? [] : [comment],
        total: empty ? 0 : 26,
        page: Number(url.searchParams.get("page") ?? 1),
        pageSize: 25,
      });
    if (url.pathname.endsWith("/reports"))
      return envelope({
        items: empty ? [] : [report],
        total: empty ? 0 : 2,
        page: Number(url.searchParams.get("page") ?? 1),
        pageSize: 25,
      });
    return json({ error: { code: "NOT_FOUND" } }, 404);
  });
  return { requests, browserUrls };
}

async function loginAsSyntheticAdmin(page: Page) {
  await page.goto("/es-AR/login", { waitUntil: "commit" });
  const form = page.locator("form[data-login-hydrated]");
  try {
    await expect(form).toHaveAttribute("data-login-hydrated", "true", {
      timeout: 10_000,
    });
  } catch {
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(form).toHaveAttribute("data-login-hydrated", "true", {
      timeout: 30_000,
    });
  }
  await page.getByLabel("Correo Electrónico").fill("e2e-admin@local.invalid");
  await page.getByLabel("Contraseña").fill("e2e-admin-password");
  await page.getByRole("button", { name: "Acceder" }).click();
  await page.waitForURL(/\/es-AR\/dashboard$/);
}

test("authenticated admin can navigate analytics, filter comments, and run an independent report", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const summaryBarrier = createResponseBarrier();
  const { requests, browserUrls } = await installAdminStack(
    page,
    false,
    summaryBarrier,
  );
  await loginAsSyntheticAdmin(page);
  const summaryRead = waitForSuccessfulAdminRead(page, "summary");
  await page.goto("/es-AR/dashboard/feedback", {
    waitUntil: "domcontentloaded",
  });
  await expect(
    page.getByRole("heading", { name: "Feedback del público" }),
  ).toBeVisible();
  await summaryBarrier.responseReached;
  try {
    await expect(page.getByText("Cargando Feedback del público")).toBeVisible();
    await expect(
      page.getByText("18", { exact: true }).first(),
    ).not.toBeVisible();
  } finally {
    summaryBarrier.releaseResponse();
  }
  await summaryRead;
  await expect(page.getByText("18", { exact: true }).first()).toBeVisible();

  const modules = page.getByRole("navigation", {
    name: "Módulos de Feedback del público",
  });
  await expect(modules.getByRole("button")).toHaveText([
    "Resumen",
    "Aspectos",
    "Puntos QR",
    "Comentarios e informes",
  ]);
  const aspectsRead = waitForSuccessfulAdminRead(page, "aspects");
  await modules.getByRole("button", { name: "Aspectos", exact: true }).click();
  await aspectsRead;
  await expect(
    page.getByRole("heading", { name: "Detalle del aspecto seleccionado" }),
  ).toBeVisible();
  const valleyAspectsRead = waitForSuccessfulAdminRead(
    page,
    "aspects",
    (query) => query.get("pointKey") === "valley",
  );
  await page.getByLabel("Punto QR").selectOption("valley");
  await valleyAspectsRead;
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Aspecto seleccionado: Vistas." }),
  ).toBeVisible();

  const qrComparisonRead = waitForSuccessfulAdminRead(page, "qr-points");
  await modules.getByRole("button", { name: "Puntos QR", exact: true }).click();
  await qrComparisonRead;
  await expect(
    page.getByRole("heading", { name: "Puntos QR comparados" }),
  ).toBeVisible();
  const qrDetailRead = waitForSuccessfulAdminRead(
    page,
    "qr-points",
    (query) => query.get("view") === "detail",
  );
  await page.getByRole("tab", { name: "Detalle" }).click();
  await qrDetailRead;
  await expect(
    page.getByRole("heading", { name: "Detalle del punto QR" }),
  ).toBeVisible();
  await expect
    .poll(() =>
      requests.some(
        ({ path, query }) =>
          path.endsWith("/qr-points") && query.includes("view=detail"),
      ),
    )
    .toBe(true);

  const commentsRead = waitForSuccessfulAdminRead(page, "comments");
  const reportsRead = waitForSuccessfulAdminRead(page, "reports");
  await modules
    .getByRole("button", { name: "Comentarios e informes", exact: true })
    .click();
  await Promise.all([commentsRead, reportsRead]);
  await expect(
    page.getByRole("heading", { name: "Comentarios" }),
  ).toBeVisible();
  await expect(page.getByText("26 comentarios encontrados.")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Informe de experiencia" }),
  ).toBeVisible();
  await page.getByLabel("Buscar en el texto del comentario").fill("excelentes");
  await page.getByLabel("Aspecto").selectOption("views");
  await page.getByRole("checkbox", { name: "5 estrellas" }).check();
  await page.getByLabel("Punto QR").selectOption("summit");
  const filteredCommentsRead = waitForSuccessfulAdminRead(
    page,
    "comments",
    (query) =>
      query.get("text") === "excelentes" &&
      query.get("aspectKey") === "views" &&
      query.getAll("rating").includes("5") &&
      query.get("pointKey") === "summit" &&
      query.get("locale") === "es",
  );
  await page.getByLabel("Idioma").selectOption("es");
  await filteredCommentsRead;
  await expect(
    page.getByRole("button", { name: "Las vistas fueron excelentes." }),
  ).toBeVisible();
  await expect
    .poll(() =>
      requests.some(
        ({ path, query }) =>
          path.endsWith("/comments") &&
          query.includes("text=excelentes") &&
          query.includes("rating=5") &&
          query.includes("locale=es"),
      ),
    )
    .toBe(true);
  await expect(page.getByText("Página 1 de 2")).toBeVisible();
  const secondPageCommentsRead = waitForSuccessfulAdminRead(
    page,
    "comments",
    (query) => query.get("page") === "2",
  );
  await page.getByRole("button", { name: "Siguiente" }).first().click();
  await secondPageCommentsRead;
  await expect
    .poll(() =>
      requests.some(
        ({ path, query }) =>
          path.endsWith("/comments") && query.includes("page=2"),
      ),
    )
    .toBe(true);

  const commentButton = page.getByRole("button", {
    name: "Las vistas fueron excelentes.",
  });
  await commentButton.click();
  await expect(
    page.getByRole("dialog", { name: "Detalle del comentario" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(commentButton).toBeFocused();

  await page.getByLabel("Desde").last().fill("2026-09-12");
  await page.getByLabel("Hasta").last().fill("2026-09-14");
  await page.getByRole("button", { name: "Solicitar informe" }).click();
  await expect(page.getByText("Solicitud run-failed: failed.")).toBeVisible();
  const generation = requests.find(
    ({ method, path }) => method === "POST" && path.endsWith("/generations"),
  );
  expect(generation?.body).toEqual({
    contractVersion: "feedback-admin.v1",
    period: { from: "2026-09-12", to: "2026-09-14" },
    override: { accepted: false, overlapDigest: null },
  });
  await page.getByRole("button", { name: "Reintentar informe" }).click();
  await expect(page.getByText("Solicitud run-failed: en cola.")).toBeVisible();
  expect(
    requests
      .filter(
        ({ method, path }) => method === "GET" && path.endsWith("/reports"),
      )
      .every(
        ({ query }) => !query.includes("text=") && !query.includes("rating="),
      ),
  ).toBe(true);
  await expect(
    page.getByText(
      "Descarga no disponible hasta que U12-A publique la entrega mediada.",
    ),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(
    browserUrls.every(
      (url) => !url.includes(":4100") && !url.includes("/api/tb113/"),
    ),
  ).toBe(true);
});

test("authenticated admin keeps module order and empty states on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const { requests, browserUrls } = await installAdminStack(page, true);
  await loginAsSyntheticAdmin(page);
  const summaryRead = waitForSuccessfulAdminRead(page, "summary");
  await page.goto("/es-AR/dashboard/feedback", {
    waitUntil: "domcontentloaded",
  });
  await summaryRead;
  await expect(
    page.getByRole("heading", { name: "Feedback del público" }),
  ).toBeVisible();
  await expect(
    page.getByRole("status").filter({ hasText: "Analizado:" }),
  ).toBeVisible();
  const modules = page.getByRole("navigation", {
    name: "Módulos de Feedback del público",
  });
  await expect(modules.getByRole("button")).toHaveText([
    "Resumen",
    "Aspectos",
    "Puntos QR",
    "Comentarios e informes",
  ]);
  const commentsRead = waitForSuccessfulAdminRead(page, "comments");
  const reportsRead = waitForSuccessfulAdminRead(page, "reports");
  await modules
    .getByRole("button", { name: "Comentarios e informes", exact: true })
    .click();
  await Promise.all([commentsRead, reportsRead]);
  await expect(
    page.getByText("No hay comentarios para estos filtros."),
  ).toBeVisible();
  await expect(
    page.getByText("No hay informes exitosos para este período."),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(
    browserUrls.every(
      (url) => !url.includes(":4100") && !url.includes("/api/tb113/"),
    ),
  ).toBe(true);
});
