import { NextResponse } from "next/server";
import { EquipmentDatabaseService } from "@/source/web/src/features/equipment-database/services/equipment-database-service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id")?.trim();
  const query = searchParams.get("query")?.trim() ?? "";
  const category = searchParams.get("category")?.trim();
  const weaponType = searchParams.get("weaponType")?.trim();
  const handsParam = searchParams.get("hands")?.trim();
  const levelParam = searchParams.get("level")?.trim();
  const includeAboveLevelParam = searchParams.get("includeAboveLevel")?.trim();
  const vocation = searchParams.get("vocation")?.trim();
  const minSlotsParam = searchParams.get("minSlots")?.trim();
  const maxWeightOzParam = searchParams.get("maxWeightOz")?.trim();
  const left = searchParams.get("left")?.trim();
  const right = searchParams.get("right")?.trim();
  const hands = handsParam ? Number(handsParam) : null;
  const level = levelParam ? Number(levelParam) : null;
  const minSlots = minSlotsParam ? Number(minSlotsParam) : null;
  const maxWeightOz = maxWeightOzParam ? Number(maxWeightOzParam) : null;

  if (left && right) {
    const comparison = EquipmentDatabaseService.compareEquipment(left, right);
    if (!comparison) {
      return NextResponse.json({ error: "Equipment comparison not found" }, { status: 404 });
    }
    return NextResponse.json({ comparison });
  }

  if (id) {
    const equipment = EquipmentDatabaseService.getEquipment(id);
    if (!equipment) {
      return NextResponse.json({ error: "Equipment not found" }, { status: 404 });
    }
    return NextResponse.json({ equipment });
  }

  return NextResponse.json({
    results: EquipmentDatabaseService.searchEquipment(query, {
      category,
      weaponType,
      hands: typeof hands === "number" && Number.isFinite(hands) ? hands : null,
      level: typeof level === "number" && Number.isFinite(level) ? level : null,
      includeAboveLevel: includeAboveLevelParam !== "false",
      vocation,
      minSlots: typeof minSlots === "number" && Number.isFinite(minSlots) ? minSlots : null,
      maxWeightOz: typeof maxWeightOz === "number" && Number.isFinite(maxWeightOz) ? maxWeightOz : null
    }),
    categories: EquipmentDatabaseService.getCategories(),
    weaponTypes: EquipmentDatabaseService.getWeaponTypes(),
    vocations: EquipmentDatabaseService.getVocations()
  });
}
