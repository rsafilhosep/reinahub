import { AppShell } from "@/components/AppShell";
import { ImbuementDatabasePage } from "@/source/web/src/features/imbuement-database/components";

export default function ImbuementsPage({ searchParams }: { searchParams?: { imbuement?: string } }) {
  return (
    <AppShell current="imbuement" mark="IM" subtitle="Imbuement Database - materiais e custos">
      <ImbuementDatabasePage initialImbuementId={searchParams?.imbuement} />
    </AppShell>
  );
}
