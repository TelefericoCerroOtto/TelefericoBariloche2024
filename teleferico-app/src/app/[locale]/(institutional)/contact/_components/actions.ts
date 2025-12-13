"use server";

import { ensureValidCaptcha, getClientIpFromHeaders } from "@/lib/http/guards";
import { sendEmail } from "@/lib/services";
import type { ContactFormData, GuardClientPayload } from "@/types";
import { headers } from "next/headers";

export async function contactUsAction(
  token: string | null,
  values: ContactFormData & GuardClientPayload,
) {
  const captcha = await ensureValidCaptcha(token);
  if (!captcha.ok) {
    return captcha.res;
  }

  const h = await headers();
  const clientIp = getClientIpFromHeaders(h);

  try {
    const { ok, message, code } = await sendEmail({ ...values, clientIp });

    return {
      success: ok,
      message,
      data: { code },
    };
  } catch (error) {
    console.error("contactUsAction error: ", error);
    return {
      success: false,
      message: "Contact action failed",
    };
  }
}
