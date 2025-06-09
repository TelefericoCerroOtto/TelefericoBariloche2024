// https://googleapis.dev/nodejs/googleapis/latest/tasks/index.html#samples

import { google } from "googleapis";
import { NextRequest } from "next/server";

const oAuth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI,
);

const credentials = {
  access_token: process.env.OAUTH_ACCESS_TOKEN ?? "",
  refresh_token: process.env.OAUTH_REFRESH_TOKEN ?? "",
  scope: "https://www.googleapis.com/auth/gmail.send",
  token_type: "Bearer",
  expiry_date: (process.env.OAUTH_TOKEN_EXPIRY_DATE as unknown as number) ?? 0,
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
