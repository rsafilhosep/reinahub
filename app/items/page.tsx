import { AppShell } from "@/components/AppShell";
import { ItemDatabasePage } from "@/source/web/src/features/item-database/components";

export default function ItemsPage({ searchParams }: { searchParams?: { itemId?: string } }) {
  return (
    <AppShell current="items" mark="ID" subtitle="Item Database - base local">
      <ItemDatabasePage initialItemId={searchParams?.itemId} />
    </AppShell>
  );
}
