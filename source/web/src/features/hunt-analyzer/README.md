# Hunt Analyzer

O Hunt Analyzer processa sessoes de hunt, enriquece loot com a base local e ajuda a encontrar falhas de mapeamento.

## Arquitetura atual

A tela publica continua em:

- `app/hunt/page.tsx`

As responsabilidades mais pesadas foram separadas para a feature:

- `components/HuntExportCards.tsx`: cards usados para gerar PNG/PDF dos relatorios de hunt e historico.
- `components/HuntHistoryPanel.tsx`: historico local de hunts, comparativos, filtros, graficos e exportacao do historico.
- `services/hunt-export-service.ts`: renderizacao de PNG, PDF, WebM, download e compartilhamento.
- `services/hunt-history-service.ts`: leitura, escrita, agrupamento e comparacao das hunts salvas.
- `services/hunt-economy-service.ts`: conversoes economicas da hunt usando o contexto ativo.

Essa divisao evita que `app/hunt/page.tsx` concentre toda a regra de importacao, historico, exportacao e calculo. A pagina deve cuidar principalmente do fluxo da tela.

## Imbuements

A aba de imbuements da hunt reutiliza `ImbuementInsightService` e `ImbuementMarketService`.

Ela mostra:

- materiais de imbuement encontrados na hunt;
- imbuements relacionados;
- quantos materiais ja tem preco de Market salvo;
- sugestoes de preco lembradas no servidor ativo;
- atalhos para revisar o material no Imbuement Database.

Quando uma sugestao e aplicada no Hunt Analyzer, o preco tambem fica salvo na memoria de precos do servidor ativo. Assim Hunt Analyzer e Imbuement Database continuam lendo do mesmo lugar.

## Exportacao

Toda exportacao deve passar pelo `HuntExportService`.

Ele concentra:

- captura do card com `html2canvas`;
- geracao de PDF com `jspdf`;
- geracao de video WebM animado;
- compartilhamento quando o navegador suportar Web Share API;
- fallback para download local.

Novos formatos de exportacao devem ser adicionados nesse servico antes de serem ligados na pagina.

## Historico

O historico visual fica em `HuntHistoryPanel`.

Esse componente recebe:

- lista de hunts salvas;
- resumo de totais;
- queries de comparacao por item e monstro;
- acoes para abrir, remover, comparar e limpar hunts.

O objetivo e manter o historico reutilizavel futuramente em dashboards, tela de personagem, metas de XP e relatorios semanais.

## Revisao de loot sem match

Quando uma hunt possui itens que nao casaram com `items.json`, a tela mostra uma aba `debug (N)`.

Nessa aba e possivel baixar um JSON de revisao manual.

Fluxo:

1. Processe uma hunt em `/hunt`.
2. Baixe o JSON pela aba `debug`.
3. Coloque o arquivo em `files_repository/hunt_unmatched_reviews/`.
4. Rode:

```bash
npm run hunt:review-unmatched
```

O comando gera:

- `source/web/src/features/hunt-analyzer/generated/unmatched-loot-review-report.json`
- `source/web/src/features/hunt-analyzer/generated/unmatched-loot-alias-candidates.json`

Esse fluxo nao altera `manual-mappings.json` automaticamente. Ele apenas agrupa nomes, quantidades e origens para revisao segura.
