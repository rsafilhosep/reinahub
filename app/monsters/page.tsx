import { AppShell } from "@/components/AppShell";
import { MonsterDatabasePage } from "@/source/web/src/features/monster-database/components";

export default function MonstersPage({ searchParams }: { searchParams?: { monster?: string } }) {
  return (
    <AppShell current="monsters" mark="MD" subtitle="Monster Database - base local">
      <MonsterDatabasePage initialMonsterName={searchParams?.monster} />
    </AppShell>
  );
}
