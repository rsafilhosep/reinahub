"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ReinaEconomyService } from "@/source/web/src/reina-core/economy";
import type { VaultServer } from "@/types/vault";
import { LiveGoalService } from "../services/live-goal-service";
import type { LiveGoal } from "../types/live-goal.types";
import { LiveGoalCard } from "./LiveGoalCard";

export function GoalOverlay() {
  const searchParams = useSearchParams();
  const [server, setServer] = useState<VaultServer | null>(null);
  const [goal, setGoal] = useState<LiveGoal | null>(null);

  useEffect(() => {
    const sync = () => {
      const activeServer = ReinaEconomyService.getActiveContext().server;
      const storedGoal = searchParams.get("id")
        ? LiveGoalService.getGoalById(searchParams.get("id") ?? "") ?? LiveGoalService.getActiveGoal()
        : LiveGoalService.getActiveGoal();
      setServer(activeServer);
      setGoal(LiveGoalService.goalFromSearchParams(new URLSearchParams(searchParams.toString()), storedGoal));
    };
    sync();
    const interval = window.setInterval(sync, 1000);
    const unsubscribe = ReinaEconomyService.subscribe(sync);
    return () => {
      window.clearInterval(interval);
      unsubscribe();
    };
  }, [searchParams]);

  const calculation = useMemo(() => {
    if (!goal) return null;
    return LiveGoalService.calculate(goal, server, searchParams.get("server") ?? "");
  }, [goal, server, searchParams]);

  if (!calculation) return null;

  return (
    <main className="live-goal-overlay-page">
      <LiveGoalCard calculation={calculation} overlay />
    </main>
  );
}
