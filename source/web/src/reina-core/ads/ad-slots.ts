export type AdSlotPlacement =
  | "home-after-stats"
  | "home-after-tools"
  | "home-footer"
  | "tool-footer";

export type AdSlotDefinition = {
  placement: AdSlotPlacement;
  label: string;
  format: "banner" | "compact";
  description: string;
};

export const AD_SLOTS: Record<AdSlotPlacement, AdSlotDefinition> = {
  "home-after-stats": {
    placement: "home-after-stats",
    label: "Home - apos indicadores",
    format: "banner",
    description: "Espaco horizontal abaixo dos indicadores principais do dashboard."
  },
  "home-after-tools": {
    placement: "home-after-tools",
    label: "Home - apos ferramentas",
    format: "banner",
    description: "Espaco horizontal apos a primeira secao de ferramentas."
  },
  "home-footer": {
    placement: "home-footer",
    label: "Home - fim do dashboard",
    format: "compact",
    description: "Espaco discreto no fim da Home."
  },
  "tool-footer": {
    placement: "tool-footer",
    label: "Ferramentas - rodape",
    format: "compact",
    description: "Espaco opcional em paginas longas, depois do conteudo principal."
  }
};

export function isAdsEnabled() {
  return process.env.NEXT_PUBLIC_REINAHUB_ADS_ENABLED === "true";
}
