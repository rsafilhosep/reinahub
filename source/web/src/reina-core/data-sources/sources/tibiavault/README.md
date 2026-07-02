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
```

O scanner le o indice publico do Bestiary, extrai nomes e URLs de criaturas e compara com `monsters.json`.

Relatorios:

- `source/web/src/reina-core/data-sources/generated/tibiavault-bestiary-index.json`
- `source/web/src/reina-core/data-sources/generated/tibiavault-bestiary-coverage.json`
- `source/web/src/reina-core/data-sources/generated/tibiavault-unmatched-monsters.json`
