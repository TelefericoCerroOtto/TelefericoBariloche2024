import { NextResponse } from "next/server";

/**
 * Procesa un valor de honeypot (venga de JSON, FormData, etc.)
 * Si el campo viene relleno, devuelve una respuesta "ok" silenciosa.
 * Si viene vacío, devuelve null para que el handler siga.
 */
export function handleHoneypot(rawValue: unknown) {
  const honeypot =
    rawValue == null // null o undefined
      ? ""
      : String(rawValue);

  if (honeypot.trim().length > 0) {
    // Bot completa el honeypot → respondemos como si todo hubiera ido bien
    return NextResponse.json(
      {
        ok: true,
        message: "Submission received",
      },
      { status: 200 },
    );
  }

  return null;
}
