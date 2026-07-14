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
    title: "Navegacao lateral e hub mais organizado",
    summary: "O ReinaHub ganhou uma navegacao lateral para crescer sem poluir o topo da tela.",
    highlights: [
      "Menu separado por Hub, Objetivos, Database e Sistema.",
      "Dashboard inicial mais claro para novos usuarios.",
      "Perfil economico ativo visivel em todas as areas principais."
    ]
  },
  {
    id: "economy-context",
    date: "Jul 2026",
    category: "system",
    title: "Perfil economico ativo para servidores e mundos",
    summary: "Cotacao, mundo, moeda premium e conversoes passaram a sair de uma fonte central.",
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
    title: "Hunt Analyzer com historico, multiplos arquivos e card",
    summary: "A analise de hunts ficou mais completa para acompanhar evolucao e compartilhar resultado.",
    highlights: [
      "Importacao por arquivo e texto colado.",
      "Historico local de sessoes salvas.",
      "Geracao de PNG/PDF com visual do ReinaHub."
    ]
  },
  {
    id: "local-database",
    date: "Jul 2026",
    category: "data",
    title: "Base local de itens, monstros, NPCs e imbuements",
    summary: "O projeto deixou de depender de uma tela isolada e passou a ter dados reutilizaveis.",
    highlights: [
      "Item Database, Monster Database e NPC Hub.",
      "Imbuement Database com materiais e simulacao economica.",
      "Servicos compartilhados para evitar duplicacao de leitura."
    ]
  },
  {
    id: "stash-live-goal",
    date: "Jul 2026",
    category: "feature",
    title: "Stash, Premium Goals e Live Goal",
    summary: "Novas ferramentas ajudam a transformar loot, patrimonio e metas em progresso visivel.",
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
      "Relatorios de assets faltantes e prioridades."
    ]
  }
];

export function getLatestUpdates(limit = 3) {
  return REINAHUB_UPDATES.slice(0, limit);
}
