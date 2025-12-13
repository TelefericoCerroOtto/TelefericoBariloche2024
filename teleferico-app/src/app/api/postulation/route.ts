import {
  createPostulationAdapter,
  postulationFormDataAdapter,
} from "@/lib/adapters";
import { ENV_KEYS } from "@/lib/constants/env.const";
import {
  handleHoneypot,
  validateFormAge,
  withFormGuards,
} from "@/lib/http/guards";
import { buildPostulationSchema } from "@/lib/schemas";
import { createPostulation, uploadFile } from "@/lib/services";
import type { PostulationApiResponse } from "@/types";
import { assertEnv } from "@/utils/env";
import { NextRequest, NextResponse } from "next/server";
import { ValidationError } from "yup";

const rateLimitStore = new Map();
const RATE_LIMIT_MAX = 2;
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const MIN_FORM_AGE_MS = 3_000;
const MAX_FORM_AGE_MS = 24 * 60 * 60 * 1000; // 24 horas
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
    if (honeypotRes) return honeypotRes;

    const formLoadedAt = formData.get(FORM_LOADED_AT_FIELD);
    const ageResult = validateFormAge(formLoadedAt, {
      maxAgeMs: MAX_FORM_AGE_MS,
      minAgeMs: MIN_FORM_AGE_MS,
    });
    if (!ageResult.ok) return ageResult.res;

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

    const uploadRes = await uploadFile(adapted.resume, strapiFormsToken);

    if (!uploadRes.ok) {
      console.log("upload resume file error: ", uploadRes.data);

      return NextResponse.json(
        { ok: false, message: "Failed to upload resume file" },
        { status: 500 },
      );
    }

    const resumeId = uploadRes.data[0].id;

    const reqBody = createPostulationAdapter({ ...validatedValues, resumeId });
    const postulationResponse = await createPostulation(
      strapiFormsToken,
      reqBody,
    );

    if (!postulationResponse.ok) {
      console.log("create postulation error: ", postulationResponse.data);

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
    console.log("Postulation API route handler error: ", error);

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
        message: "Unknown contact handler error",
      },
      { status: 500 },
    );
  }
}

export const POST = withFormGuards(
  {
    useInternalApiKey: true,
    rateLimited: {
      rateLimitStore,
      maxHits: RATE_LIMIT_MAX,
      windowMs: RATE_LIMIT_WINDOW_MS,
    },
  },
  postulationHandler,
);
