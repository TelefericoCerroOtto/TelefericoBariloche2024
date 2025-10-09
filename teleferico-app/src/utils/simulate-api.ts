// lib/simulateApi.ts
export type SimulatedResponse<T = { message: string }> = {
  ok: true;
  delayMs: number;
  resolvedAt: string; // ISO date
  data: T;
};

/**
 * Simula una llamada a API esperando `timeoutMs` milisegundos
 * y resolviendo con un payload genérico.
 *
 * @param timeoutMs - milisegundos a esperar antes de resolver
 */
export async function simulateApi(
  timeoutMs: number,
): Promise<SimulatedResponse> {
  const delay =
    Number.isFinite(timeoutMs) && timeoutMs > 0 ? Math.floor(timeoutMs) : 0;

  await new Promise<void>((resolve) => setTimeout(resolve, delay));

  return {
    ok: true,
    delayMs: delay,
    resolvedAt: new Date().toISOString(),
    data: { message: "Simulated payload" },
  };
}
