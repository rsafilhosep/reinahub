import { NextResponse } from "next/server";
import { ItemDatabaseService } from "@/source/web/src/features/item-database/services";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id")?.trim();
  const name = searchParams.get("name")?.trim();
  const query = searchParams.get("query")?.trim();
  const category = searchParams.get("category")?.trim();

  if (id) {
    const item = ItemDatabaseService.getItem(id);
    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }
    return NextResponse.json({ item });
  }

  if (name) {
    const item = ItemDatabaseService.getItemByName(name);
    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }
    return NextResponse.json({ item });
  }

  return NextResponse.json({
    results: query ? ItemDatabaseService.searchItems(query, { category }) : []
  });
}
