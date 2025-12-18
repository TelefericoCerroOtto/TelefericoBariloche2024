"use server";

import { ensureValidCaptcha, getClientIpFromHeaders } from "@/lib/http/guards";
import { sendPostulation } from "@/lib/services/postulation";
import { GuardClientPayload, PostulationFormData } from "@/types";
import { headers } from "next/headers";

export const sendPostulationAction = async (
  token: string | null,
  values: PostulationFormData & GuardClientPayload,
) => {
  const captcha = await ensureValidCaptcha(token);
  if (!captcha.ok) {
    return captcha.res;
  }

  const h = await headers();
  const clientIp = getClientIpFromHeaders(h);

  try {
    const { ok, message, code } = await sendPostulation({
      ...values,
      clientIp,
    });

    return {
      success: ok,
      message,
      data: { code },
    };
  } catch (error) {
    console.error("sendPostulationAction error: ", error);
    return {
      success: false,
      message: "Postulation action failed",
    };
  }
};
