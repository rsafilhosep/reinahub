import { NextResponse } from "next/server";
import { ImbuementDatabaseService } from "@/source/web/src/features/imbuement-database/services";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id")?.trim();
  const query = searchParams.get("query")?.trim() ?? "";
  const tier = searchParams.get("tier")?.trim() ?? "";

  if (id) {
    const imbuement = ImbuementDatabaseService.getImbuement(id);
    if (!imbuement) {
      return NextResponse.json({ error: "Imbuement not found" }, { status: 404 });
    }
    return NextResponse.json({ imbuement });
  }

  return NextResponse.json({
    results: ImbuementDatabaseService.searchImbuements(query, { tier })
  });
}
