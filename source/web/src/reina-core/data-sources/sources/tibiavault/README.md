# TibiaVault Source Notes

TibiaVault pode ser usado como referencia para Bestiary e metadados de entidades.

Uso permitido nesta fase:

- estudar estrutura de dados;
- gerar scans controlados;
- criar relatorios;
- comparar com a base local;
- salvar dados locais somente depois de normalizacao e validacao.

Uso nao permitido:

- depender do site em runtime;
- copiar layout/experiencia;
- importar dados automaticamente para `ReinaDataService`;
- baixar imagens em massa sem prioridade e revisao.

## Scanner atual

```bash
npm run datasource:scan-tibiavault-bestiary
npm run datasource:scan-tibiavault-npcs
```

O scanner le o indice publico do Bestiary, extrai nomes e URLs de criaturas e compara com `monsters.json`.

Relatorios:

- `source/web/src/reina-core/data-sources/generated/tibiavault-bestiary-index.json`
- `source/web/src/reina-core/data-sources/generated/tibiavault-bestiary-coverage.json`
- `source/web/src/reina-core/data-sources/generated/tibiavault-unmatched-monsters.json`

## Scanner de NPCs

O scanner de NPCs le a pagina publica do TibiaVault, localiza `npc-data.js`, extrai
`_NPC_DATA` como texto e gera relatorios sem executar o JavaScript externo.

Relatorios:

- `source/web/src/reina-core/data-sources/generated/tibiavault-npcs-raw.json`
- `source/web/src/reina-core/data-sources/generated/tibiavault-npcs-normalized.json`
- `source/web/src/reina-core/data-sources/generated/tibiavault-npcs-coverage.json`
- `source/web/src/reina-core/data-sources/generated/tibiavault-npc-unresolved-items.json`

Uso recomendado:

1. Revisar NPCs novos em `tibiavault-npcs-coverage.json`.
2. Revisar itens sem correspondencia em `tibiavault-npc-unresolved-items.json`.
3. Criar mappings ou supplemental items quando necessario.
4. Promover dados revisados para os importadores locais, nunca direto para runtime.
