import {
  SUPPORT_SLOTS,
  isSupportKindEnabled,
  type SupportSlotPlacement
} from "@/source/web/src/reina-core/support/support-slots";

export function SupportSlot({ placement }: { placement: SupportSlotPlacement }) {
  const slot = SUPPORT_SLOTS[placement];

  if (!isSupportKindEnabled(slot.kind)) return null;

  return (
    <aside className={`support-slot support-slot-${slot.format}`} aria-label={slot.label}>
      <div className="label">{getKindLabel(slot.kind)}</div>
      <div className="support-slot-title">{slot.label}</div>
      <div className="note">{slot.description}</div>
    </aside>
  );
}

function getKindLabel(kind: string) {
  if (kind === "ad") return "espaco comercial";
  if (kind === "donation") return "apoio voluntario";
  return "parceria futura";
}
