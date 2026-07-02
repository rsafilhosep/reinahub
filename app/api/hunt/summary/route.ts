import { NextResponse } from "next/server";
import { summarizeHunt } from "@/services/hunt-service";
import type { HuntSession } from "@/types/vault";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const hunt = (await request.json()) as HuntSession;
    return NextResponse.json(summarizeHunt(hunt));
  } catch (error) {
    return NextResponse.json(
      {
        error: "Invalid hunt JSON",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 400 }
    );
  }
}
