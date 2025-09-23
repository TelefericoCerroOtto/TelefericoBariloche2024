// https://googleapis.dev/nodejs/googleapis/latest/tasks/index.html#samples

import { ENV_KEYS } from "@/lib/constants/env.const";
import { GOOGLE_OAUTH_SCOPES } from "@/lib/google/constants";
import { assertEnv } from "@/utils/env";
import { google } from "googleapis";
import { NextRequest } from "next/server";

assertEnv([
  ENV_KEYS.GOOGLE_CLIENT_ID,
  ENV_KEYS.GOOGLE_CLIENT_SECRET,
  ENV_KEYS.OAUTH_REDIRECT_URI,
  ENV_KEYS.OAUTH_REFRESH_TOKEN,
]);

const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  OAUTH_REDIRECT_URI,
  OAUTH_REFRESH_TOKEN,
} = process.env;

const oAuth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  OAUTH_REDIRECT_URI,
);

const credentials = {
  refresh_token: OAUTH_REFRESH_TOKEN,
  scope: GOOGLE_OAUTH_SCOPES[0],
  token_type: "Bearer",
};

oAuth2Client.setCredentials(credentials);

const gmail = google.gmail({ version: "v1", auth: oAuth2Client });

export async function POST(req: NextRequest) {
  const body = await req.json();
  const requiredFields = ["name", "email", "consultation"];

  const missingFields = requiredFields.filter((field) => !body[field]);

  if (missingFields.length > 0) {
    return new Response(
      JSON.stringify({
        message: `Missing fields: ${missingFields.join(", ")}`,
      }),
      { status: 400 },
    );
  }

  try {
    const rawMessage = [
      `From: ${process.env.GMAIL_SENDER}`,
      `To: ${process.env.GMAIL_RECEIVER}`,
      "Subject: Nuevo mensaje desde el formulario de contacto",
      "Content-Type: text/plain; charset=utf-8",
      "",
      `Nombre: ${body.name}`,
      `Email: ${body.email}`,
      "",
      `Mensaje:`,
      body.consultation,
    ].join("\n");

    const encodedMessage = Buffer.from(rawMessage)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: encodedMessage,
      },
    });

    return new Response(JSON.stringify({ message: "Email sent" }), {
      status: 200,
    });
  } catch (error) {
    console.error("API route handler sending email error: ", error);
    return new Response(
      JSON.stringify({ message: "Error while sending email" }),
      { status: 500 },
    );
  }
}
