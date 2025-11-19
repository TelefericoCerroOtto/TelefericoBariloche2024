"use server";

import { sendEmail } from "@/lib/services";
import type { ContactFormData, FormSubmitServerActionResponse } from "@/types";

// Extend the payload with abuse-detection metadata before sending it to the API.
type ContactUsActionInput = {
  token: string | null;
  values: ContactFormData;
  honeypot: string;
  submittedAt: number;
};

export async function contactUsAction({
  token,
  values,
  honeypot,
  submittedAt,
}: ContactUsActionInput): FormSubmitServerActionResponse {
  if (!token) {
    return {
      success: false,
      message: "Captcha token is missing.",
    };
  }

  try {
    const { ok, message } = await sendEmail({
      ...values,
      submittedAt,
      company: honeypot,
      token,
    });

    return {
      success: ok,
      message,
    };
  } catch (error) {
    console.error(
      "contactUsAction error",
      error instanceof Error ? error.message : error,
    );
    return {
      success: false,
      message: "Contact action failed",
    };
  }
}
