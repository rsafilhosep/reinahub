import { AppShell } from "@/components/AppShell";
import { StashPage } from "@/source/web/src/features/stash/components";

export default function StashRoute() {
  return (
    <AppShell current="stash" mark="ST" subtitle="Stash - patrimonio e itens">
      <StashPage />
    </AppShell>
  );
}
