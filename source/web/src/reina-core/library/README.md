# ReinaHub Library Coverage

Esta camada mede a cobertura da biblioteca local do ReinaHub.

## Comando

```bash
npm run library:coverage
```

## O que o relatorio cruza

- `items.json` e `supplemental-items.json`
- `monster-loot.json`
- `npc-sell-prices.json`
- `npc-trades.json`
- assets em `public/assets/items`
- materiais de imbuement

## Saidas

Os arquivos ficam em `source/web/src/reina-core/library/generated/`:

- `library-coverage-summary.json`
- `library-coverage-report.json`
- `missing-item-images-priority.json`
- `missing-npc-prices-priority.json`

## Regra

Esse comando nao altera dados da base. Ele apenas mostra o que falta completar e quais itens devem ser priorizados.
