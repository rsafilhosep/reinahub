import { NextResponse } from "next/server";
import { NpcHubService } from "@/source/web/src/features/npc-hub/services";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name")?.trim();
  const query = searchParams.get("query")?.trim();

  if (name) {
    const npc = NpcHubService.getNpc(name);
    if (!npc) {
      return NextResponse.json({ error: "NPC not found" }, { status: 404 });
    }
    return NextResponse.json({ npc });
  }

  return NextResponse.json({
    results: query ? NpcHubService.searchNpcs(query) : []
  });
}
