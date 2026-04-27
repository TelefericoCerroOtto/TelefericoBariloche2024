import { NextResponse } from "next/server";

import { getRegistry, saveRegistry } from "@/lib/server/registry-store";
import type { SlotProfileRegistry } from "@/lib/studio/types";

export async function GET() {
  return NextResponse.json({ registry: await getRegistry() });
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as { registry: SlotProfileRegistry };
    return NextResponse.json({ registry: await saveRegistry(body.registry) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 },
    );
  }
}
