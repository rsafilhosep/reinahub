import { AppShell } from "@/components/AppShell";
import { LiveGoalPage } from "@/source/web/src/features/live-goal/components";

export default function LiveGoalRoute() {
  return (
    <AppShell current="live-goal" mark="LG" subtitle="Live Goal - overlay de objetivo">
      <LiveGoalPage />
    </AppShell>
  );
}
