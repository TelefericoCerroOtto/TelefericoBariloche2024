import { NextRequest, NextResponse } from "next/server";
import { assertEnv } from "@/utils/env";
import { ENV_KEYS } from "@/lib/constants/env.const";

// Podés agregar este key a ENV_KEYS si querés tiparlo mejor
const DEFAULT_ENV_KEY = ENV_KEYS.INTERNAL_API_KEY;
const DEFAULT_HEADER = "x-internal-api-key";

type RequireInternalApiKeyOptions = {
  /**
   * Nombre del header donde esperás la API key.
   * Ej: "x-internal-api-key"
   */
  headerName?: string;
  /**
   * Nombre de la env que contiene la API key.
   * Ej: "INTERNAL_API_KEY"
   */
  envKey?: string;
};

/**
 * Verifica que la request incluya una API key interna válida.
 * Devuelve:
 * - `NextResponse` con 401/500 si falla la validación.
 * - `null` si la validación fue exitosa.
 *
 * Uso típico:
 *   const authError = requireInternalApiKey(req);
 *   if (authError) return authError;
 */
export function requireInternalApiKey(
  req: NextRequest,
  options: RequireInternalApiKeyOptions = {},
): NextResponse | null {
  const headerName = options.headerName ?? DEFAULT_HEADER;
  const envKey = options.envKey ?? DEFAULT_ENV_KEY;

  // Si falta la env, es un error de configuración del servidor.
  try {
    assertEnv([envKey]);
  } catch (error) {
    console.error("Missing internal API key env:", error);
    return NextResponse.json(
      {
        ok: false,
        message: "Server misconfigured",
      },
      { status: 500 },
    );
  }

  const expectedKey = process.env[envKey]!;
  const receivedKey = req.headers.get(headerName);

  if (!receivedKey || receivedKey !== expectedKey) {
    return NextResponse.json(
      {
        ok: false,
        message: "Unauthorized",
      },
      { status: 401 },
    );
  }

  return null;
}
