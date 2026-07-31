# Quick Tools

As ferramentas rapidas concentram atalhos que precisam estar disponiveis em varias paginas do ReinaHub.

## O que existe hoje

- Conversor rapido entre GC, moeda premium e R$.
- Troca rapida do servidor/mundo ativo.
- Objetivo rapido em moeda premium ou gold.
- Calculo de monstros necessarios para uma meta de XP.
- Calculo de quantidade de itens necessaria para bater uma meta em gold.

## Organizacao

- `components/QuickEconomyConverter.tsx`: modal visual usado no topo do app.
- `hooks/useQuickToolsContext.ts`: carrega contexto economico, servidores salvos e personagem ativo.
- `services/quick-tools-service.ts`: regras de calculo reutilizaveis.
- `types/quick-tools.types.ts`: tipos compartilhados da feature.

## Regras

- Conversoes devem usar `ReinaEconomyService`.
- Personagem ativo deve vir do `ReinaActiveContextService`.
- Busca de itens e monstros deve usar os services dos databases locais.
- Nenhuma pagina deve recalcular cotacao manualmente quando puder chamar `QuickToolsService`.

## Uso futuro

Essa feature pode alimentar:

- overlay de live;
- metas premium;
- tela de personagem;
- dashboards;
- comparativos de hunt;
- atalhos na sidebar.
