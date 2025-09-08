"use server";

// import { verifyCaptchaToken } from "@/lib/services";
import { sendEmail } from "@/lib/services";
import type { ContactFormData, FormSubmitServerActionResponse } from "@/types";

export async function contactUsAction(
  token: string | null,
  values: ContactFormData,
): FormSubmitServerActionResponse {
  if (!token) {
    return {
      success: false,
      message: "Token not found",
    };
  }

  try {
    // TODO: implement backend token verification
    // const captchaData = await verifyCaptchaToken(token);
    // console.log("captchaData: ", captchaData);

    // if (captchaData.success === false) {
    //   return {
    //     success: false,
    //     message: "Captcha Failed",
    //   };
    // }

    const data = await sendEmail(values);
    return data;
  } catch (error) {
    console.log("contactUsAction error:", error);
    return {
      success: false,
      message: "Contact action failed",
    };
  }
}
