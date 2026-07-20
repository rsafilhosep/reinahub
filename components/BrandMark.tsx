import { Crown } from "lucide-react";

export function BrandMark({ mark, variant = "initials" }: { mark: string; variant?: "initials" | "crest" }) {
  const isCrest = variant === "crest";

  return (
    <div className={`brand-mark${isCrest ? " brand-mark-crest" : ""}`} aria-label={`ReinaHub ${mark}`}>
      <span className="brand-mark-rim" aria-hidden="true" />
      {isCrest ? (
        <img className="brand-mark-image" src="/assets/brand/reinahub-crest-256.png" alt="" aria-hidden="true" />
      ) : (
        <>
          <Crown className="brand-mark-crown" size={14} aria-hidden="true" />
          <span>{mark}</span>
          <span className="brand-mark-gem" aria-hidden="true" />
        </>
      )}
    </div>
  );
}
