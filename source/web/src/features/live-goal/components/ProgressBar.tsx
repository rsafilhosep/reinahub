"use client";

export function ProgressBar({ value }: { value: number }) {
  const safeValue = Math.min(100, Math.max(0, Number(value) || 0));

  return (
    <div className="live-goal-progress" aria-label={`Progresso ${safeValue.toFixed(1)}%`}>
      <div className="live-goal-progress-fill" style={{ width: `${safeValue}%` }} />
      <div className="live-goal-progress-shine" />
    </div>
  );
}
