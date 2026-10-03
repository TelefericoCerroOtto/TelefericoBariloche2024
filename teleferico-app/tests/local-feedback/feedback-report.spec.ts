import { expect, test } from "@playwright/test";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import {
  LOCAL_FEEDBACK_OPERATOR_EMAIL,
  LOCAL_FEEDBACK_OPERATOR_PASSWORD,
  LOCAL_FEEDBACK_PERIOD,
} from "./synthetic-identity.mjs";

const APP_ORIGIN = "http://localhost:3200";
const CAPABILITIES = [
  "feedback.read",
  "feedback.comments.read",
  "feedback.reports.read",
  "feedback.reports.generate",
];
type FeedbackGenerationListItem = {
  reportRunId?: string;
  status?: string;
  failureCode?: string | null;
};
type FeedbackReportListItem = { reportId?: string; canDownload?: boolean };

test("a CMS-authenticated operator generates, reads, and downloads a persisted worker PDF", async ({
  page,
}) => {
  const feedbackRequests: string[] = [];
  const feedbackResponses: string[] = [];
  let downloadRequestSecurity = "not requested";
  let observedGenerations: Array<{
    reportRunId?: string;
    status?: string;
    failureCode?: string | null;
  }> = [];
  const authResponses: string[] = [];
  let callbackResult: string | null = null;
  page.on("request", (request) => {
    const url = request.url();
    if (url.includes("/api/admin/feedback/")) feedbackRequests.push(url);
    if (url.includes("/api/admin/feedback/reports/") && url.endsWith("/download")) {
      const headers = request.headers();
      downloadRequestSecurity = `csrf=${Boolean(headers["x-csrf-token"])} origin=${headers.origin ?? "missing"}`;
    }
  });
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (url.pathname.startsWith("/api/admin/feedback/")) {
      const prefix = `${response.request().method()} ${url.pathname} ${response.status()}`;
      if (
        response.ok() &&
        response.request().method() === "GET" &&
        url.pathname === "/api/admin/feedback/generations"
      ) {
        void response
          .json()
          .then((body) => {
            const items: FeedbackGenerationListItem[] = Array.isArray(body?.data?.items)
              ? body.data.items
              : [];
            observedGenerations = items.map((item) => ({
              reportRunId: item.reportRunId,
              status: item.status,
              failureCode: item.failureCode,
            }));
            const summary = items.map((item) => ({
              reportRunId: item.reportRunId,
              status: item.status,
              failureCode: item.failureCode,
            }));
            feedbackResponses.push(`${prefix} items=${JSON.stringify(summary)}`);
          })
          .catch(() => feedbackResponses.push(`${prefix} invalid-envelope`));
        return;
      }
      if (
        response.ok() &&
        response.request().method() === "GET" &&
        url.pathname === "/api/admin/feedback/reports"
      ) {
        void response
          .json()
          .then((body) => {
            const items: FeedbackReportListItem[] = Array.isArray(body?.data?.items)
              ? body.data.items
              : [];
            feedbackResponses.push(
              `${prefix} items=${JSON.stringify(items.map((item) => ({ reportId: item.reportId, canDownload: item.canDownload })))}`,
            );
          })
          .catch(() => feedbackResponses.push(`${prefix} invalid-envelope`));
        return;
      }
      if (!response.ok()) {
        void response
          .json()
          .then((body) => {
            const code = typeof body?.error?.code === "string" ? body.error.code : "unknown";
            feedbackResponses.push(`${prefix} ${code}`);
          })
          .catch(() => feedbackResponses.push(`${prefix} invalid-error-body`));
      } else {
        feedbackResponses.push(prefix);
      }
    }
    if (url.pathname.startsWith("/api/auth/"))
      authResponses.push(`${response.request().method()} ${url.pathname} ${response.status()}`);
    if (url.pathname === "/api/auth/callback/credentials") {
      void response
        .json()
        .then((body) => {
          const redirect = typeof body?.url === "string" ? new URL(body.url, APP_ORIGIN) : null;
          callbackResult = redirect
            ? `${redirect.pathname}?${[...redirect.searchParams.keys()].sort().join(",")}`
            : "callback response had no redirect URL";
        })
        .catch(() => {
          callbackResult = "callback response was not JSON";
        });
    }
  });

  await page.goto("/es-AR/login", { waitUntil: "domcontentloaded" });
  const form = page.locator("form[data-login-hydrated]");
  await expect(form).toHaveAttribute("data-login-hydrated", "true");
  await page.getByLabel("Correo Electrónico").fill(LOCAL_FEEDBACK_OPERATOR_EMAIL);
  await page.getByLabel("Contraseña").fill(LOCAL_FEEDBACK_OPERATOR_PASSWORD);
  await page.getByRole("button", { name: "Acceder" }).click();
  try {
    await page.waitForURL((url) => url.pathname === "/es-AR/dashboard", {
      timeout: 90_000,
    });
  } catch {
    const alert = await page
      .getByRole("alert")
      .innerText()
      .catch(() => "no safe login alert");
    const sessionSummary = await page
      .evaluate(async () => {
        const response = await fetch("/api/auth/session", {
          credentials: "same-origin",
          cache: "no-store",
        });
        const session = await response.json().catch(() => null);
        return {
          status: response.status,
          authenticated: Boolean(session?.user),
          role: session?.user?.role?.name ?? null,
          capabilities: session?.user?.capabilities ?? [],
          exposesJwt: Boolean(session?.jwt || session?.user?.jwt),
        };
      })
      .catch(() => ({ status: 0, authenticated: false, role: null, capabilities: [], exposesJwt: false }));
    throw new Error(
      `Synthetic login failed at ${new URL(page.url()).pathname}: ${authResponses.join("; ")}; callback=${callbackResult ?? "pending"}; session=${JSON.stringify(sessionSummary)}; alert=${alert.slice(0, 160)}`,
    );
  }

  const session = await page.evaluate(async () => {
    const response = await fetch("/api/auth/session", {
      credentials: "same-origin",
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Auth.js session failed: ${response.status}`);
    return response.json();
  });
  expect(session.user.role.name).toBe("Digital Experience Operator");
  expect(session.user.capabilities).toEqual(CAPABILITIES);
  expect(session.user).not.toHaveProperty("jwt");
  expect(session).not.toHaveProperty("jwt");
  expect(typeof session.csrfToken).toBe("string");

  await page.goto("/es-AR/dashboard/feedback", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "Feedback del público" }),
  ).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "Analizado:" })).toBeVisible();
  await page.getByRole("button", { name: "Comentarios e informes" }).click();
  try {
    await expect(page.getByRole("heading", { name: "Generar informe" })).toBeVisible();
  } catch {
    const alert = await page
      .getByRole("alert")
      .allTextContents()
      .catch(() => []);
    throw new Error(
      `Feedback dashboard reads did not become ready: ${feedbackResponses.join("; ")}; alerts=${alert.join(" ").slice(0, 200)}`,
    );
  }

  const missingCsrf = await page.evaluate(async (period) => {
    const response = await fetch("/api/admin/feedback/generations", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contractVersion: "feedback-admin.v1",
        period,
        override: { accepted: false, overlapDigest: null },
      }),
    });
    return response.status;
  }, LOCAL_FEEDBACK_PERIOD);
  expect(missingCsrf).toBe(403);

  const untrustedOrigin = await page.context().request.post(
    `${APP_ORIGIN}/api/admin/feedback/generations`,
    {
      headers: {
        origin: "https://attacker.invalid",
        "content-type": "application/json",
        "x-csrf-token": session.csrfToken,
      },
      data: {
        contractVersion: "feedback-admin.v1",
        period: LOCAL_FEEDBACK_PERIOD,
        override: { accepted: false, overlapDigest: null },
      },
    },
  );
  expect(untrustedOrigin.status()).toBe(403);

  await page.getByLabel("Desde").last().fill(LOCAL_FEEDBACK_PERIOD.from);
  await page.getByLabel("Hasta").last().fill(LOCAL_FEEDBACK_PERIOD.to);
  const commandResponse = page.waitForResponse((response) =>
    response.request().method() === "POST" &&
    new URL(response.url()).pathname === "/api/admin/feedback/generations",
  );
  await page.getByRole("button", { name: "Solicitar informe" }).click();
  const accepted = await commandResponse;
  expect(accepted.status()).toBe(202);
  const command = await accepted.json();
  expect(command.status).toBe("queued");
  expect(typeof command.reportRunId).toBe("string");

  const generationRow = page
    .locator("article")
    .filter({ hasText: command.reportRunId });
  let persistedGeneration = observedGenerations.find(
    ({ reportRunId }) => reportRunId === command.reportRunId,
  );
  for (let attempt = 0; persistedGeneration?.status !== "succeeded" && attempt < 60; attempt += 1) {
    if (persistedGeneration?.status === "failed")
      throw new Error(`The persisted worker generation failed: ${JSON.stringify(persistedGeneration)}`);
    const historyRefresh = page.getByRole("button", { name: "Actualizar historial" });
    const historyResponse = page.waitForResponse((response) =>
      response.request().method() === "GET" &&
      new URL(response.url()).pathname === "/api/admin/feedback/generations",
    );
    await historyRefresh.click();
    await historyResponse;
    await page.waitForTimeout(500);
    persistedGeneration = observedGenerations.find(
      ({ reportRunId }) => reportRunId === command.reportRunId,
    );
  }
  if (persistedGeneration?.status !== "succeeded")
    throw new Error(
      `Persisted generation ${command.reportRunId} did not succeed; rows=${JSON.stringify(observedGenerations)}; reads=${feedbackResponses.join("; ")}`,
    );
  const succeededGeneration = page
    .locator("article")
    .filter({ hasText: command.reportRunId })
    .locator('[data-generation-status="succeeded"]');
  await expect(succeededGeneration).toBeVisible();

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Feedback del público" })).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "Analizado:" })).toBeVisible();
  await expect(page.locator('meta[name="csrf-token"]')).toHaveAttribute("content", /.+/);
  const persistedReports = page.waitForResponse((response) =>
    response.request().method() === "GET" &&
    new URL(response.url()).pathname === "/api/admin/feedback/reports",
  );
  await page.getByRole("button", { name: "Comentarios e informes" }).click();
  await persistedReports;
  const downloadLink = page.getByRole("button", { name: "Descargar PDF" });
  try {
    await expect(downloadLink).toBeVisible();
  } catch {
    throw new Error(`Persisted report download link was not rendered: ${feedbackResponses.join("; ")}`);
  }

  const downloadResponse = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return response.request().method() === "GET" &&
      /^\/api\/admin\/feedback\/reports\/[0-9a-f-]+\/download$/.test(url.pathname);
  });
  const downloadEvent = page.waitForEvent("download");
  await downloadLink.click({ timeout: 10_000, noWaitAfter: true });
  const downloadResult = await Promise.race([
    Promise.all([downloadResponse, downloadEvent]),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 20_000)),
  ]);
  if (!downloadResult)
    throw new Error(`Mediated PDF download did not complete (${downloadRequestSecurity}): ${feedbackResponses.join("; ")}`);
  const [response, download] = downloadResult;
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toBe("application/pdf");
  expect(response.headers().etag).toMatch(/^"[a-f0-9]{64}"$/);
  const pdf = await readFile(await download.path());
  expect(pdf.subarray(0, 5).toString("ascii")).toBe("%PDF-");
  expect(pdf.toString("latin1")).toMatch(/%%EOF\s*$/);
  expect(createHash("sha256").update(pdf).digest("hex")).toBe(
    response.headers().etag?.replaceAll('"', ""),
  );

  expect(feedbackRequests.length).toBeGreaterThan(0);
  expect(
    feedbackRequests.every(
      (url) => new URL(url).origin === APP_ORIGIN && !url.includes("/api/tb113/"),
    ),
  ).toBe(true);
});
