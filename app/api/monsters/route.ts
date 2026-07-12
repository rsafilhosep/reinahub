import { NextResponse } from "next/server";
import { MonsterDatabaseService } from "@/source/web/src/features/monster-database/services";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name")?.trim();
  const query = searchParams.get("query")?.trim();
  const creatureClass = searchParams.get("class")?.trim() ?? "";
  const classes = searchParams.get("classes") === "1";

  if (classes) {
    return NextResponse.json({
      classes: MonsterDatabaseService.getClassSummary()
    });
  }

  if (name) {
    const monster = MonsterDatabaseService.getMonster(name);
    if (!monster) {
      return NextResponse.json({ error: "Monster not found" }, { status: 404 });
    }
    return NextResponse.json({ monster });
  }

  return NextResponse.json({
    results: query || creatureClass ? MonsterDatabaseService.searchMonsters(query ?? "", creatureClass) : []
  });
}
