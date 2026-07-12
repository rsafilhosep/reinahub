"use client";

export function DashboardCardVisual({
  fallback,
  muted = false,
  src
}: {
  fallback: string;
  muted?: boolean;
  src: string;
}) {
  return (
    <img
      className={`dashboard-card-visual${muted ? " is-muted" : ""}`}
      src={src}
      alt=""
      loading="lazy"
      onError={(event) => {
        event.currentTarget.src = fallback;
      }}
    />
  );
}
