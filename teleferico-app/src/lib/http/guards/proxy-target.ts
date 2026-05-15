import { NextRequest } from "next/server";

type BuildProxyTargetOptions = {
  // prefijos permitidos (ej: ["api/", "uploads/"]). Si no se pasa, no filtra.
  allowedPrefixes?: string[];
};

// Centraliza la construcción del target URL del proxy y bloquea inputs maliciosos:
// evita “escape” del base (URL absoluta o //host) y path traversal (.. / .) para
// prevenir open-proxy/SSRF y que se filtren credenciales (p.ej. Authorization) a terceros.

function normalizeBaseUrl(base: string) {
  return base.endsWith("/") ? base : `${base}/`;
}

export function buildProxyTargetURL(
  req: NextRequest,
  endpoint: string[],
  baseUrl: string,
  opts: BuildProxyTargetOptions = {},
): { ok: true; url: URL } | { ok: false; error: Response } {
  const base = normalizeBaseUrl(baseUrl);
  const rawPath = endpoint.join("/");
  const path = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;

  // 1) Evitar URL absoluta / scheme-relative (escape del base)
  if (
    rawPath.startsWith("http://") ||
    rawPath.startsWith("https://") ||
    rawPath.startsWith("//")
  ) {
    return { ok: false, error: new Response("Forbidden", { status: 403 }) };
  }

  // 2) Evitar paths vacios
  if (!rawPath) {
    return { ok: false, error: new Response("Forbidden", { status: 403 }) };
  }

  // 3) Evitar path traversal
  if (endpoint.some((seg) => seg === ".." || seg === ".")) {
    return { ok: false, error: new Response("Forbidden", { status: 403 }) };
  }

  // 4) Allowlist opcional (recomendado)
  if (opts.allowedPrefixes?.length) {
    const allowed = opts.allowedPrefixes.some(
      (p) => path === p || path.startsWith(`${p}/`),
    );
    if (!allowed) {
      return { ok: false, error: new Response("Forbidden", { status: 403 }) };
    }
  }

  // 5) Construir URL y copiar query params
  const url = new URL(path, base);
  req.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  return { ok: true, url };
}
