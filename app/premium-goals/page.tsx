import { AppShell } from "@/components/AppShell";
import { PremiumGoalsPage } from "@/source/web/src/features/premium-goals/components";

export default function PremiumGoalsRoute() {
  return (
    <AppShell current="premium-goals" mark="PG" subtitle="Premium Goals - objetivos de moeda premium">
      <PremiumGoalsPage />
    </AppShell>
  );
}
