import { Crown } from "lucide-react";

export function BrandMark({ mark }: { mark: string }) {
  return (
    <div className="brand-mark" aria-label={`ReinaHub ${mark}`}>
      <Crown className="brand-mark-crown" size={14} aria-hidden="true" />
      <span>{mark}</span>
      <span className="brand-mark-gem" aria-hidden="true" />
    </div>
  );
}
