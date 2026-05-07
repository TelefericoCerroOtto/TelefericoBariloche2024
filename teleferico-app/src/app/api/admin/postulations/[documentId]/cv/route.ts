import { auth } from "@/auth";
import { ENV_KEYS } from "@/lib/constants/env.const";
import { ensureTrustedBrowserRequest } from "@/lib/http/guards";
import { getPostulationByDocumentId } from "@/lib/services";
import { createCvStorage } from "@/lib/services/cv-storage";
import type { UserRole } from "@/types";
import { assertEnv } from "@/utils/env";
import { Readable } from "node:stream";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const ALLOWED_ROLES: UserRole["name"][] = ["Administrator", "Recruiter"];

function sanitizeDownloadFilename(filename: string) {
  return filename.replace(/["\r\n]/g, "_");
}

function toWebStream(stream: ReadableStream | NodeJS.ReadableStream): BodyInit {
  if (stream instanceof ReadableStream) return stream;
  return Readable.toWeb(stream as Readable) as unknown as BodyInit;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> },
) {
  const trustedRequest = ensureTrustedBrowserRequest(req);
  if (!trustedRequest.ok) return trustedRequest.res;

  try {
    assertEnv([ENV_KEYS.BUILD_STRAPI_BASE_URL]);

    const session = await auth();
    if (!session?.jwt) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 },
      );
    }

    const roleName = session.user?.role?.name;
    if (!roleName || !ALLOWED_ROLES.includes(roleName)) {
      return NextResponse.json(
        { message: "Forbidden" },
        { status: 403 },
      );
    }

    const { documentId } = await params;
    const postulationRes = await getPostulationByDocumentId(
      documentId,
      session.jwt,
    );

    if (!postulationRes.ok) {
      return NextResponse.json(
        { message: "Postulation not found" },
        { status: 404 },
      );
    }

    const postulation = postulationRes.data.data;
    if (
      !postulation.cvObjectKey ||
      !postulation.cvOriginalName ||
      !postulation.cvMimeType
    ) {
      return NextResponse.json(
        { message: "CV not available" },
        { status: 404 },
      );
    }

    const storage = createCvStorage(postulation.cvStorageProvider ?? null);
    let readable: ReadableStream | NodeJS.ReadableStream;

    try {
      readable = await storage.getReadableStream(postulation.cvObjectKey);
    } catch (error) {
      console.log("postulation cv storage read error: ", error);

      return NextResponse.json(
        { message: "CV not available" },
        { status: 404 },
      );
    }

    const headers = new Headers({
      "Content-Type": postulation.cvMimeType,
      "Content-Disposition": `attachment; filename="${sanitizeDownloadFilename(postulation.cvOriginalName)}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });

    if (postulation.cvSize) {
      headers.set("Content-Length", String(postulation.cvSize));
    }

    return new Response(toWebStream(readable), {
      status: 200,
      headers,
    });
  } catch (error) {
    console.log("postulation cv download route error: ", error);

    return NextResponse.json(
      { message: "Failed to download CV" },
      { status: 500 },
    );
  }
}
