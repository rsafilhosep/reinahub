import { AppShell } from "@/components/AppShell";
import { EquipmentDatabasePage } from "@/source/web/src/features/equipment-database/components";

export default function EquipmentPage({ searchParams }: { searchParams?: { equipment?: string } }) {
  return (
    <AppShell current="equipment" mark="EQ" subtitle="Equipment Database - gear analyzer">
      <EquipmentDatabasePage initialEquipmentId={searchParams?.equipment} />
    </AppShell>
  );
}
