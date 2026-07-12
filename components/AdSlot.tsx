import { AD_SLOTS, isAdsEnabled, type AdSlotPlacement } from "@/source/web/src/reina-core/ads/ad-slots";

export function AdSlot({ placement }: { placement: AdSlotPlacement }) {
  if (!isAdsEnabled()) return null;

  const slot = AD_SLOTS[placement];

  return (
    <aside className={`ad-slot ad-slot-${slot.format}`} aria-label={slot.label}>
      <div className="label">Espaco reservado</div>
      <div className="ad-slot-title">{slot.label}</div>
      <div className="note">{slot.description}</div>
    </aside>
  );
}
