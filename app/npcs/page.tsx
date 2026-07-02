import { AppShell } from "@/components/AppShell";
import { NpcHubPage } from "@/source/web/src/features/npc-hub/components";

export default function NpcsPage({ searchParams }: { searchParams?: { npc?: string } }) {
  return (
    <AppShell current="npcs" mark="NH" subtitle="NPC HUB - relacoes e servicos">
      <NpcHubPage initialNpcName={searchParams?.npc} />
    </AppShell>
  );
}
