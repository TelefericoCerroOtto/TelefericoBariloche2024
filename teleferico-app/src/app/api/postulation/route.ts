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
import { MAX_FILE_SIZE } from "@/lib/schemas/forms/constants";
import { createCvStorage, createPostulation } from "@/lib/services";
import type { PostulationApiResponse, StoredCvFile } from "@/types";
import { assertEnv } from "@/utils/env";
import { NextRequest, NextResponse } from "next/server";
import { ValidationError } from "yup";

const rateLimitStore = new Map();
const RATE_LIMIT_MAX = 2;
const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
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
          console.log("cleanup cv after postulation failure error: ", cleanupError);
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
    maxBodyBytes: MAX_BODY_BYTES,
    useInternalApiKey: true,
    rateLimited: {
      rateLimitStore,
      maxHits: RATE_LIMIT_MAX,
      windowMs: RATE_LIMIT_WINDOW_MS,
    },
  },
  postulationHandler,
);
