// https://googleapis.dev/nodejs/googleapis/latest/tasks/index.html#samples

import { ensureGmail } from "@/lib/google/gmail";
import {
  handleHoneypot,
  sanitizeInput,
  validateFormAge,
  withFormGuards,
} from "@/lib/http/guards";
import { buildContactSchema } from "@/lib/schemas";
import type { ContactApiResponse } from "@/types";
import { withTimeout } from "@/utils/promise-timeout";
import { NextRequest, NextResponse } from "next/server";
import { ValidationError } from "yup";

const REQUEST_TIMEOUT_MS = 10_000;
const MAX_BODY_BYTES = 8 * 1024; // keep payloads tiny to limit abuse
const RATE_LIMIT_MAX = 2;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MIN_FORM_AGE_MS = 5 * 1000; // 5 seconds
const MAX_FORM_AGE_MS = 30 * 60 * 1000; // 30 minutes
const HONEYPOT_FIELD = "honeypot";
const FORM_LOADED_AT_FIELD = "formLoadedAt";

const rateLimitStore = new Map();

async function contactHandler(
  req: NextRequest,
): Promise<NextResponse<ContactApiResponse>> {
  try {
    const contentType = req.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json(
        {
          ok: false,
          message: "Unsupported content type",
        },
        { status: 415 },
      );
    }

    let rawBody = "";
    rawBody = await withTimeout(
      req.text(),
      REQUEST_TIMEOUT_MS,
      "REQUEST_TIMEOUT",
    );
    if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) {
      return NextResponse.json(
        {
          ok: false,
          message: "Payload too large",
        },
        { status: 413 },
      );
    }

    const parsedBody = JSON.parse(rawBody) as Record<string, unknown>;

    const rawHoneypot = parsedBody[HONEYPOT_FIELD];
    const honeypotRes = handleHoneypot(rawHoneypot);
    if (honeypotRes) return honeypotRes;

    // submittedAt viene del momento en que el form se cargó / reseteó en el cliente.
    // Sirve para estimar cuánto tiempo tuvo el usuario el formulario antes de enviarlo
    // y filtrar submissions demasiado rápidas (probable bot) o demasiado viejas.

    const formLoadedAt = parsedBody[FORM_LOADED_AT_FIELD];
    const ageResult = validateFormAge(formLoadedAt, {
      maxAgeMs: MAX_FORM_AGE_MS,
      minAgeMs: MIN_FORM_AGE_MS,
    });
    if (!ageResult.ok) return ageResult.res;

    const { name, email, consultation } = parsedBody;
    await buildContactSchema("en").validate(
      { name, email, consultation },
      { abortEarly: false, stripUnknown: true },
    );

    const safeName = sanitizeInput(String(name));
    const safeEmail = sanitizeInput(String(email));
    const safeConsultation = sanitizeInput(String(consultation));

    const gmail = ensureGmail();

    const rawMessage = [
      `From: ${process.env.GMAIL_SENDER}`,
      `To: ${process.env.GMAIL_RECEIVER}`,
      "Subject: Nuevo mensaje desde el formulario de contacto",
      "Content-Type: text/plain; charset=utf-8",
      "",
      `Nombre: ${safeName}`,
      `Email: ${safeEmail}`,
      "",
      "Mensaje:",
      safeConsultation,
      "",
      `Enviado: ${new Date(ageResult.formLoadedAtMs).toISOString()}`,
    ].join("\n");

    const encodedMessage = Buffer.from(rawMessage)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    await withTimeout(
      gmail.users.messages.send({
        userId: "me",
        requestBody: {
          raw: encodedMessage,
        },
      }),
      REQUEST_TIMEOUT_MS,
      "GMAIL_TIMEOUT",
    );

    return NextResponse.json({
      ok: true,
      message: "Email sent",
    });
  } catch (error) {
    console.log("Contact API route handler error: ", error);

    if (error instanceof ValidationError) {
      return NextResponse.json(
        {
          ok: false,
          message: "Validation failed",
        },
        { status: 400 },
      );
    }

    if (error instanceof Error) {
      switch (error.message) {
        case "REQUEST_TIMEOUT":
          return NextResponse.json(
            {
              ok: false,
              message: "Request timed out",
            },
            { status: 408 },
          );

        case "GMAIL_TIMEOUT":
          return NextResponse.json(
            {
              ok: false,
              message: "Failed to deliver message",
            },
            { status: 504 },
          );
        default:
          return NextResponse.json(
            {
              ok: false,
              message: error.message || "Contact route hanlder error",
            },
            { status: 500 },
          );
      }
    }

    return NextResponse.json(
      {
        ok: false,
        message: "Unknown contact handler error",
      },
      { status: 500 },
    );
  }
}

export const POST = withFormGuards(
  {
    maxBodyBytes: MAX_BODY_BYTES,
    rateLimited: {
      rateLimitStore,
      maxHits: RATE_LIMIT_MAX,
      windowMs: RATE_LIMIT_WINDOW_MS,
    },
    useInternalApiKey: true,
  },
  contactHandler,
);
