// src/lib/http/form-age.ts
import { NextResponse } from "next/server";

export type FormAgeValidationOptions = {
  minAgeMs: number;
  maxAgeMs: number;
};

/**
 * Valida el timestamp de carga del formulario y su "edad".
 * - rawValue: valor crudo del campo (venga de JSON, FormData, etc.)
 * - options: min/max en milisegundos
 */
export function validateFormAge(
  rawValue: unknown,
  options: FormAgeValidationOptions,
):
  | { ok: false; res: NextResponse<{ ok: false; message: string }> }
  | { ok: true; formLoadedAtMs: number } {
  const { minAgeMs, maxAgeMs } = options;

  const formLoadedAtMs =
    typeof rawValue === "number" ? rawValue : Number(rawValue);

  if (!Number.isFinite(formLoadedAtMs)) {
    return {
      ok: false,
      res: NextResponse.json(
        {
          ok: false,
          message: "Missing submission timestamp",
        },
        { status: 400 },
      ),
    };
  }

  const now = Date.now();
  const formAgeMs = now - formLoadedAtMs;

  if (formAgeMs < minAgeMs || formAgeMs > maxAgeMs) {
    return {
      ok: false,
      res: NextResponse.json(
        {
          ok: false,
          message: "Invalid submission timing",
          code: "INVALID_FORM_AGE",
        },
        { status: 400 },
      ),
    };
  }

  return { ok: true, formLoadedAtMs };
}
