import {
  createPostulationAdapter,
  postulationFormDataAdapter,
} from "@/lib/adapters";
import { i18n } from "@/i18n";
import { ENV_KEYS } from "@/lib/constants/env.const";
import {
  createConfiguredRateLimitStore,
  emitFormGuardEvent,
  getFormProtectionPolicy,
  getFormRateLimitPolicy,
  handleHoneypot,
  validateFormAge,
  withFormGuards,
} from "@/lib/http/guards";
import { buildPostulationSchema } from "@/lib/schemas";
import { MAX_FILE_SIZE } from "@/lib/schemas/forms/constants";
import {
  buildFormProtectionSignal,
  createPostulation,
  evaluateFormBusinessRules,
  getSectors,
} from "@/lib/services";
import { createCvStorage } from "@/lib/services/cv-storage";
import type {
  PostulationApiResponse,
  PublicFormName,
  StoredCvFile,
} from "@/types";
import { assertEnv } from "@/utils/env";
import { NextRequest, NextResponse } from "next/server";
import { ValidationError } from "yup";

const FORM_NAME: PublicFormName = "postulation";
const protectionPolicy = getFormProtectionPolicy();
const rateLimitStore = createConfiguredRateLimitStore({
  connectTimeoutMs: protectionPolicy.redis.connectTimeoutMs,
  nodeEnv: process.env.NODE_ENV,
  url: protectionPolicy.redis.url ?? "",
});
const rateLimitPolicy = getFormRateLimitPolicy(FORM_NAME);

const MAX_BODY_BYTES = MAX_FILE_SIZE + 512 * 1024; // resume limit + multipart overhead
const MIN_FORM_AGE_MS = 5 * 1000; // 5 seconds
const MAX_FORM_AGE_MS = 15 * 60 * 1000; // 15 minutes
const HONEYPOT_FIELD = "honeypot";
const FORM_LOADED_AT_FIELD = "formLoadedAt";

async function postulationHandler(
  req: NextRequest,
): Promise<NextResponse<PostulationApiResponse>> {
  try {
    assertEnv([ENV_KEYS.STRAPI_FORMS_TOKEN]);
    const strapiFormsToken = process.env[ENV_KEYS.STRAPI_FORMS_TOKEN] as string;

    const contentType = req.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      emitFormGuardEvent({
        action: "block",
        form: FORM_NAME,
        status: 415,
        reason: "unsupported_content_type",
      });

      return NextResponse.json(
        {
          ok: false,
          message: "Unsupported content type",
        },
        { status: 415 },
      );
    }

    const formData = await req.formData();

    const rawHoneypot = formData.get(HONEYPOT_FIELD);
    const honeypotRes = handleHoneypot(rawHoneypot);
    if (honeypotRes) {
      emitFormGuardEvent({
        action: "block",
        form: FORM_NAME,
        status: honeypotRes.status,
        reason: "honeypot_triggered",
      });

      return honeypotRes;
    }

    const formLoadedAt = formData.get(FORM_LOADED_AT_FIELD);
    const ageResult = validateFormAge(formLoadedAt, {
      maxAgeMs: MAX_FORM_AGE_MS,
      minAgeMs: MIN_FORM_AGE_MS,
    });
    if (!ageResult.ok) {
      emitFormGuardEvent({
        action: "block",
        form: FORM_NAME,
        status: ageResult.res.status,
        reason: "invalid_form_age",
      });

      return ageResult.res;
    }

    const adapted = postulationFormDataAdapter(formData);

    if (!(adapted.resume instanceof File)) {
      return NextResponse.json(
        { ok: false, message: "Resume file is missing or invalid" },
        { status: 400 },
      );
    }

    const validatedValues = await buildPostulationSchema("en").validate(
      adapted,
      {
        abortEarly: false,
        stripUnknown: true,
      },
    );

    const sectorsRes = await getSectors(i18n.defaultLocale, {
      activeOnly: true,
    });

    if (!sectorsRes.ok) {
      return NextResponse.json(
        {
          ok: false,
          message: "Failed to validate postulation sector",
        },
        { status: 500 },
      );
    }

    const sectorIsActive =
      sectorsRes.data?.data.some(
        (sector) => sector.documentId === validatedValues.sector,
      ) ?? false;

    if (!sectorIsActive) {
      return NextResponse.json(
        {
          ok: false,
          message: "Selected sector is unavailable",
        },
        { status: 400 },
      );
    }

    const businessRules = await evaluateFormBusinessRules({
      email: validatedValues.email,
      form: FORM_NAME,
      metadata: {
        resumeName: adapted.resume.name,
        resumeSize: adapted.resume.size,
      },
      sectorDocumentId: validatedValues.sector,
      signal: buildFormProtectionSignal({
        email: validatedValues.email,
        form: FORM_NAME,
        origin: req.headers.get("origin"),
        sectorDocumentId: validatedValues.sector,
        userAgent: req.headers.get("user-agent"),
      }),
    });

    if (!businessRules.ok) {
      emitFormGuardEvent({
        action: "block",
        backend: "strapi",
        form: FORM_NAME,
        layer: "business",
        status: 503,
        reason: "business_rule_unavailable",
      });

      return NextResponse.json(
        {
          ok: false,
          code: businessRules.code,
          message: businessRules.message,
        },
        { status: 503 },
      );
    }

    if (!businessRules.allowed) {
      const isDuplicate = businessRules.code === "DUPLICATE_SUBMISSION";

      emitFormGuardEvent({
        action: "block",
        backend: "strapi",
        form: FORM_NAME,
        layer: "business",
        status: isDuplicate ? 409 : 429,
        reason: isDuplicate
          ? "business_rule_duplicate"
          : "business_rule_email_limited",
      });

      return NextResponse.json(
        {
          ok: false,
          code: businessRules.code,
          message: businessRules.message,
        },
        { status: isDuplicate ? 409 : 429 },
      );
    }

    emitFormGuardEvent({
      action: "allow",
      backend: "strapi",
      form: FORM_NAME,
      layer: "business",
      status: 202,
      reason: "allowed",
    });

    const cvStorage = createCvStorage();
    let storedCv: StoredCvFile | null = null;

    try {
      storedCv = await cvStorage.save(adapted.resume);

      const reqBody = createPostulationAdapter({
        ...validatedValues,
        cv: storedCv,
      });
      const postulationResponse = await createPostulation(
        strapiFormsToken,
        reqBody,
      );

      if (!postulationResponse.ok) {
        console.log("create postulation error: ", postulationResponse.data);

        await cvStorage.delete(storedCv.objectKey).catch((cleanupError) => {
          console.log(
            "cleanup cv after postulation failure error: ",
            cleanupError,
          );
        });

        return NextResponse.json(
          {
            ok: false,
            message: "Failed to create postulation",
          },
          { status: 500 },
        );
      }

      return NextResponse.json(
        {
          ok: true,
          message: "Postulation created successfully",
        },
        { status: 201 },
      );
    } catch (error) {
      if (storedCv) {
        await cvStorage.delete(storedCv.objectKey).catch((cleanupError) => {
          console.log("cleanup cv after route failure error: ", cleanupError);
        });
      }

      throw error;
    }
  } catch (error) {
    console.log("Postulation API route handler error: ", error);
    emitFormGuardEvent({
      action: "error",
      form: FORM_NAME,
      status: 500,
      reason: "unexpected_error",
      error,
    });

    if (error instanceof ValidationError) {
      return NextResponse.json(
        {
          ok: false,
          message: "Validation failed",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        message: "Unknown postulation handler error",
      },
      { status: 500 },
    );
  }
}

export const POST = withFormGuards(
  {
    form: FORM_NAME,
    maxBodyBytes: MAX_BODY_BYTES,
    rateLimited: rateLimitPolicy.enabled
      ? {
          namespace: protectionPolicy.redis.namespace,
          rateLimitStore,
          maxHits: rateLimitPolicy.maxHits,
          windowMs: rateLimitPolicy.windowMs,
        }
      : undefined,
    useInternalApiKey: true,
  },
  postulationHandler,
);
