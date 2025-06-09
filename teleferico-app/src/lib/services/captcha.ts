// reCaptcha v3 validation functions

// export async function getCaptchaToken() {
//   return new Promise<string | null>((resolve) => {
//     grecaptcha.ready(async () => {
//       const siteKey = process.env.NEXT_PUBLIC_CAPTCHA_SITE_KEY;
//       if (!siteKey) {
//         resolve(null);
//         return;
//       }
//       const token = await grecaptcha.execute(siteKey, {
//         action: "contact",
//       });
//       resolve(token);
//     });
//   });
// }

// export async function verifyCaptchaToken(token: string) {
// const secretKey = process.env.RECAPTCHA_SECRET_KEY;
// if (!secretKey) {
//   throw new Error("No secret key found");
// }

//   const url = new URL("https://www.google.com/recaptcha/api/siteverify");
//   url.searchParams.append("secret", secretKey);
//   url.searchParams.append("response", token);

//   const res = await fetch(url, { method: "POST" });
//   const captchaData: CaptchaData = await res.json();

//   if (!res.ok) return null;

//   return captchaData;
// }

export async function verifyCaptchaToken(token: string) {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  const apiKey = process.env.RECAPTCHA_API_KEY;

  if (!secretKey) {
    throw new Error("No captcha secret key found");
  }
  if (!apiKey) {
    throw new Error("No captcha api key found");
  }

  // Authenticate REST token validation request docs
  // https://cloud.google.com/docs/authentication/rest?hl=es-419

  const res = await fetch(
    `https://www.google.com/recaptcha/api/siteverify?key=${apiKey}&secret=${secretKey}&response=${token}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": apiKey,
      },
    },
  );
  const captchaData: CaptchaData = await res.json();

  console.log("recaptcha response: ", captchaData);
  return captchaData;
}

type CaptchaData =
  | {
      success: true;
      challenge_ts: string;
      hostname: string;
      score: number;
      action: string;
    }
  | {
      success: false;
      "error-codes": ErrorCodes[];
    };

type ErrorCodes =
  | "invalid-keys"
  | "missing-input-secret"
  | "invalid-input-secret"
  | "missing-input-response"
  | "invalid-input-response"
  | "bad-request"
  | "timeout-or-duplicate";
