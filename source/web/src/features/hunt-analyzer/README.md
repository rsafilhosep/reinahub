# Hunt Analyzer

O Hunt Analyzer processa sessoes de hunt, enriquece loot com a base local e ajuda a encontrar falhas de mapeamento.

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
