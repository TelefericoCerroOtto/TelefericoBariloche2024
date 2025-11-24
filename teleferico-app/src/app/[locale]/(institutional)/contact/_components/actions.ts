"use server";

import { sendEmail } from "@/lib/services";
import type {
  ContactRequestPayload,
  FormSubmitServerActionResponse,
} from "@/types";

export async function contactUsAction(
  token: string | null,
  values: ContactRequestPayload,
): FormSubmitServerActionResponse {
  if (!token) {
    return {
      success: false,
      message: "Captcha token is missing.",
    };
  }

  // TODO: implement backend token verification
  // const captchaData = await verifyCaptchaToken(token);
  // console.log("captchaData: ", captchaData);

  // if (captchaData.success === false) {
  //   return {
  //     success: false,
  //     message: "Captcha Failed",
  //   };
  // }

  try {
    const { ok, message } = await sendEmail(values);

    return {
      success: ok,
      message,
    };
  } catch (error) {
    console.error("contactUsAction error: ", error);
    return {
      success: false,
      message: "Contact action failed",
    };
  }
}
