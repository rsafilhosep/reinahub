import type { PremiumProduct } from "../types/premium-goals.types";

export const PREMIUM_PRODUCTS: PremiumProduct[] = [
  {
    id: "premium-time-30",
    name: "Premium / VIP 30 dias",
    category: "account",
    defaultCost: 250,
    availability: "unknown",
    notes: "Valor inicial placeholder. Ajuste quando catalogar o valor correto."
  },
  {
    id: "premium-time-90",
    name: "Premium / VIP 90 dias",
    category: "account",
    defaultCost: 750,
    availability: "unknown",
    notes: "Valor inicial placeholder. Ajuste quando catalogar o valor correto."
  },
  {
    id: "xp-boost",
    name: "XP Boost",
    category: "boost",
    defaultCost: 30,
    availability: "unknown",
    notes: "Valor inicial placeholder."
  },
  {
    id: "store-item-custom",
    name: "Produto premium personalizado",
    category: "custom",
    defaultCost: 0,
    availability: "unknown",
    notes: "Use override do servidor para informar o valor real."
  }
];
