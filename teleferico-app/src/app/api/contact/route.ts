// https://googleapis.dev/nodejs/googleapis/latest/tasks/index.html#samples

import { ensureGmail } from "@/lib/google/gmail";
import { extractOrigin } from "@/lib/http/extract-origin";
import { getClientIp } from "@/lib/http/get-client-ip";
import { sanitizeInput } from "@/lib/http/sanitize";
import { buildContactSchema } from "@/lib/schemas";
import { withTimeout } from "@/utils/promise-timeout";
import { NextRequest, NextResponse } from "next/server";
import { ValidationError } from "yup";

const REQUEST_TIMEOUT_MS = 10_000;
const MAX_BODY_BYTES = 8 * 1024; // keep payloads tiny to limit abuse
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const MIN_FORM_AGE_MS = 3_000;
const MAX_FORM_AGE_MS = 30 * 60 * 1000;
const HONEYPOT_FIELD = "honeypot";
const FORM_LOADED_AT_FIELD = "formLoadedAt";

// Basic in-memory rate limiter to slow abusive clients. Per-instance only.
type RateEntry = {
  hits: number;
  reset: number;
};
const rateLimitStore = new Map<string, RateEntry>();

// Track the allowed origins once to enforce simple same-origin protection.
const allowedOrigins = (() => {
  const origins = new Set<string>();
  const base = process.env.NEXT_PUBLIC_BASE_URL;
  if (base) origins.add(base.replace(/\/$/, ""));
  const extra = process.env.CONTACT_ALLOWED_ORIGINS;
  if (extra) {
    extra
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
      .forEach((origin) => origins.add(origin.replace(/\/$/, "")));
  }
  return origins;
})();

function isRateLimited(ip: string, now: number) {
  const entry = rateLimitStore.get(ip);
  if (!entry || entry.reset <= now) {
    rateLimitStore.set(ip, { hits: 1, reset: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.hits += 1;
  if (entry.hits > RATE_LIMIT_MAX) {
    return true;
  }
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const origin = extractOrigin(req);
    if (allowedOrigins.size > 0 && (!origin || !allowedOrigins.has(origin))) {
      return NextResponse.json(
        {
          ok: false,
          message: "Forbidden",
        },
        { status: 403 },
      );
    }

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

    const contentLengthHeader = req.headers.get("content-length");
    if (contentLengthHeader) {
      const contentLength = Number(contentLengthHeader);
      if (!Number.isFinite(contentLength) || contentLength > MAX_BODY_BYTES) {
        return NextResponse.json(
          {
            ok: false,
            message: "Payload too large",
          },
          { status: 413 },
        );
      }
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

    const honeypot =
      rawHoneypot == null // null o undefined
        ? ""
        : String(rawHoneypot);

    if (honeypot.trim().length > 0) {
      // Bot completes honeypot field. Respond as if the submission succeeded so bots do not learn about the trap.
      return NextResponse.json({
        ok: true,
        message: "Submission received",
      });
    }

    // submittedAt viene del momento en que el form se cargó / reseteó en el cliente.
    // Sirve para estimar cuánto tiempo tuvo el usuario el formulario antes de enviarlo
    // y filtrar submissions demasiado rápidas (probable bot) o demasiado viejas.

    const formLoadedAt = parsedBody[FORM_LOADED_AT_FIELD];
    const formLoadedAtMs =
      typeof formLoadedAt === "number" ? formLoadedAt : Number(formLoadedAt);
    const now = Date.now();
    if (!Number.isFinite(formLoadedAtMs)) {
      return NextResponse.json(
        {
          ok: false,
          message: "Missing submission timestamp",
        },
        { status: 400 },
      );
    }

    const formAge = now - formLoadedAtMs;
    if (formAge < MIN_FORM_AGE_MS || formAge > MAX_FORM_AGE_MS) {
      return NextResponse.json(
        {
          ok: false,
          message: "Invalid submission timing",
        },
        { status: 400 },
      );
    }

    const ip = getClientIp(req);
    if (isRateLimited(ip, now)) {
      return NextResponse.json(
        {
          ok: false,
          message: "Too many requests",
        },
        { status: 429 },
      );
    }

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
      `Enviado: ${new Date(formLoadedAtMs).toISOString()}`,
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
    console.log("Contact API route handler error error: ", error);

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

    if (error instanceof ValidationError) {
      return NextResponse.json(
        {
          ok: false,
          message: "Validation failed",
        },
        { status: 400 },
      );
    }
  }
}
