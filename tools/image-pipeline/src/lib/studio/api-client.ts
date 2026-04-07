/**
 * Typed fetch wrapper for Studio API routes.
 *
 * Parses the response as JSON and throws a descriptive Error when the
 * response is not OK, extracting the `error` field from the body when
 * available.
 */
export async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? `Error ${response.status}`);
  }
  return (await response.json()) as T;
}
