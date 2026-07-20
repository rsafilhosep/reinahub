export type ReinaUpdate = {
  id: string;
  date: string;
  category: "major" | "feature" | "data" | "ui" | "system";
  title: string;
  summary: string;
  highlights: string[];
};

export const REINAHUB_UPDATES: ReinaUpdate[] = [
  {
    id: "navigation-sidebar",
    date: "Jul 2026",
    category: "major",
    title: "Navegação lateral e hub mais organizado",
    summary: "O ReinaHub ganhou uma navegação lateral para crescer sem poluir o topo da tela.",
    highlights: [
      "Menu separado por Hub, Objetivos, Database e Sistema.",
      "Dashboard inicial mais claro para novos usuários.",
      "Perfil econômico ativo visível em todas as áreas principais."
    ]
  },
  {
    id: "economy-context",
    date: "Jul 2026",
    category: "system",
    title: "Perfil econômico ativo para servidores e mundos",
    summary: "Cotação, mundo, moeda premium e conversões passaram a sair de uma fonte central.",
    highlights: [
      "Suporte a Tibia Global, RubinOT e cadastro manual.",
      "Troca de servidor ativa refletida nas ferramentas.",
      "Base pronta para comparativos entre perfis."
    ]
  },
  {
    id: "hunt-analyzer-export",
    date: "Jul 2026",
    category: "feature",
    title: "Hunt Analyzer com histórico, múltiplos arquivos e card",
    summary: "A análise de hunts ficou mais completa para acompanhar evolução e compartilhar resultado.",
    highlights: [
      "Importação por arquivo e texto colado.",
      "Histórico local de sessões salvas.",
      "Geração de PNG/PDF com visual do ReinaHub."
    ]
  },
  {
    id: "local-database",
    date: "Jul 2026",
    category: "data",
    title: "Base local de itens, monstros, NPCs e imbuements",
    summary: "O projeto deixou de depender de uma tela isolada e passou a ter dados reutilizáveis.",
    highlights: [
      "Item Database, Monster Database e NPC Hub.",
      "Imbuement Database com materiais e simulação econômica.",
      "Serviços compartilhados para evitar duplicação de leitura."
    ]
  },
  {
    id: "stash-live-goal",
    date: "Jul 2026",
    category: "feature",
    title: "Stash, Premium Goals e Live Goal",
    summary: "Novas ferramentas ajudam a transformar loot, patrimônio e metas em progresso visível.",
    highlights: [
      "Stash manual por item e quantidade.",
      "Objetivos de premium, VIP, item ou moeda premium.",
      "Overlay de live para metas de gold, TC, RC e bestiary."
    ]
  },
  {
    id: "assets-system",
    date: "Jul 2026",
    category: "data",
    title: "Sistema local de assets e imagens",
    summary: "Sprites de itens e criaturas passaram a ser resolvidos por uma camada central.",
    highlights: [
      "Fallbacks seguros para imagens ausentes.",
      "Scanner e importador de inbox para GIFs/PNGs.",
      "Relatórios de assets faltantes e prioridades."
    ]
  }
];

export function getLatestUpdates(limit = 3) {
  return REINAHUB_UPDATES.slice(0, limit);
}
