import { getCsrfTokenFromMeta } from "@/lib/http/guards";

export async function authenticatedInternalApiFetch(
  input: RequestInfo,
  init: RequestInit = {},
) {
  const csrfToken = getCsrfTokenFromMeta();

  const headers = new Headers(init.headers || {});
  if (csrfToken) {
    headers.set("x-csrf-token", csrfToken);
  }

  return await fetch(input, {
    ...init,
    headers,
    credentials: "include",
  });
}
