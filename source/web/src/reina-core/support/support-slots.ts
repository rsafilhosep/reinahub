export type SupportSlotPlacement =
  | "home-support"
  | "tool-footer-support"
  | "export-support"
  | "sidebar-support";

export type SupportSlotKind = "ad" | "donation" | "partner";

export type SupportSlotDefinition = {
  placement: SupportSlotPlacement;
  kind: SupportSlotKind;
  label: string;
  format: "banner" | "compact" | "inline";
  description: string;
};

export const SUPPORT_SLOTS: Record<SupportSlotPlacement, SupportSlotDefinition> = {
  "home-support": {
    placement: "home-support",
    kind: "partner",
    label: "Apoio do ReinaHub",
    format: "banner",
    description: "Espaco futuro para parceiro, campanha, apoio ou comunicacao discreta na Home."
  },
  "tool-footer-support": {
    placement: "tool-footer-support",
    kind: "ad",
    label: "Apoio em ferramenta",
    format: "compact",
    description: "Espaco opcional no fim de ferramentas longas, sem interromper calculos ou formularios."
  },
  "export-support": {
    placement: "export-support",
    kind: "partner",
    label: "Credito de exportacao",
    format: "inline",
    description: "Espaco futuro para apoio discreto em PNG/PDF, sempre separado dos dados do usuario."
  },
  "sidebar-support": {
    placement: "sidebar-support",
    kind: "donation",
    label: "Apoie o projeto",
    format: "compact",
    description: "Espaco futuro para doacao voluntaria, sem bloquear funcionalidades."
  }
};

export function isSupportEnabled() {
  return process.env.NEXT_PUBLIC_REINAHUB_SUPPORT_ENABLED === "true";
}

export function isSupportKindEnabled(kind: SupportSlotKind) {
  if (!isSupportEnabled()) return false;
  if (kind === "ad") return process.env.NEXT_PUBLIC_REINAHUB_ADS_ENABLED === "true";
  if (kind === "donation") return process.env.NEXT_PUBLIC_REINAHUB_DONATIONS_ENABLED === "true";
  if (kind === "partner") return process.env.NEXT_PUBLIC_REINAHUB_PARTNERS_ENABLED === "true";
  return false;
}
