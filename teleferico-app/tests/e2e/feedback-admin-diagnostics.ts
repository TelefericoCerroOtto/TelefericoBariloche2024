const ALLOWED_PATHS = new Set([
  "/es-AR/login",
  "/es-AR/dashboard",
  "/es-AR/dashboard/feedback",
  "/api/auth/csrf",
  "/api/auth/providers",
  "/api/auth/signin",
  "/api/auth/callback/credentials",
  "/api/auth/session",
  "/api/admin/feedback/summary",
  "/api/admin/feedback/aspects",
  "/api/admin/feedback/qr-points",
  "/api/admin/feedback/comments",
  "/api/admin/feedback/reports",
  "/api/admin/feedback/generations",
  "/api/admin/feedback/generations/retry",
]);

const MAX_RECORDS = 24;
const MAX_BYTES = 3_072;
const RECORD_BUDGET = MAX_BYTES - 16;

type DiagnosticRecord = Record<string, string | number>;

function safeMethod(method: string) {
  return ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"].includes(
    method,
  )
    ? method
    : "OTHER";
}

function allowedPath(rawUrl: string) {
  try {
    const pathname = new URL(rawUrl).pathname;
    return ALLOWED_PATHS.has(pathname) ? pathname : null;
  } catch {
    return null;
  }
}

function failureCategory(errorText: string) {
  const normalized = errorText.toLowerCase();
  if (normalized.includes("timeout")) return "timeout";
  if (normalized.includes("abort")) return "aborted";
  if (normalized.includes("dns") || normalized.includes("name_not_resolved"))
    return "dns";
  if (normalized.includes("refused")) return "connection_refused";
  if (normalized.includes("reset")) return "connection_reset";
  if (normalized.includes("tls") || normalized.includes("ssl")) return "tls";
  return "other";
}

export function createFeedbackAdminDiagnostics() {
  const records: DiagnosticRecord[] = [];
  let truncated = false;

  const append = (record: DiagnosticRecord) => {
    if (records.length >= MAX_RECORDS) {
      truncated = true;
      return;
    }
    const candidate = JSON.stringify({ records: [...records, record], truncated });
    if (candidate.length > RECORD_BUDGET) {
      truncated = true;
      return;
    }
    records.push(record);
  };

  return {
    request(method: string, rawUrl: string) {
      const path = allowedPath(rawUrl);
      if (path) append({ event: "request", method: safeMethod(method), path });
    },
    response(method: string, rawUrl: string, status: number) {
      const path = allowedPath(rawUrl);
      if (path) {
        append({ event: "response", method: safeMethod(method), path, status });
      }
    },
    requestFailed(method: string, rawUrl: string, errorText: string) {
      const path = allowedPath(rawUrl);
      if (path) {
        append({
          event: "requestfailed",
          method: safeMethod(method),
          path,
          category: failureCategory(errorText),
        });
      }
    },
    navigation(rawUrl: string) {
      const path = allowedPath(rawUrl);
      if (path) append({ event: "navigation", path });
    },
    format() {
      const output = JSON.stringify({ records, truncated });
      return output.length <= MAX_BYTES ? output : '{"records":[],"truncated":true}';
    },
  };
}
