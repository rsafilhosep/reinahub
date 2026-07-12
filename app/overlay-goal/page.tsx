import { Suspense } from "react";
import { GoalOverlay } from "@/source/web/src/features/live-goal/components";

export default function OverlayGoalRoute() {
  return (
    <Suspense fallback={null}>
      <GoalOverlay />
    </Suspense>
  );
}
