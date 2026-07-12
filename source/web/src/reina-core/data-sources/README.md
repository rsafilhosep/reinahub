# ReinaHub Data Sources

Esta pasta organiza fontes externas e pacotes brutos que podem enriquecer o ReinaHub.

Ela nao alimenta o app automaticamente.

## Objetivo

Criar uma camada segura para transformar fontes externas em dados locais do ReinaHub, sem deixar a aplicacao dependente de sites ou servicos de terceiros.

## Estrutura

- `source-manifest.json`: catalogo das fontes permitidas e seu status.
- `sources/`: espaco para configuracoes, notas e scanners por fonte.
- `generated/`: relatorios gerados por scanners de fontes.
- `scripts/`: scripts de verificacao e scanners controlados.

## Regras

- Nao copiar visual ou experiencia de sites externos.
- Nao chamar sites externos no runtime das paginas.
- Nao importar dados direto para `ReinaDataService`.
- Sempre gerar relatorio antes de promover dados.
- Salvar proveniencia: fonte, URL/caminho, data e script.
- Assets externos devem virar arquivos locais revisados em `public/assets`.

## Fluxo

```text
fonte
  -> scan/captura
  -> relatorio
  -> normalizacao
  -> validacao
  -> merge controlado
  -> generated local
```

## Fontes iniciais

- TibiaVault: referencia planejada para bestiary e entidades.
- TibiaWiki: referencia planejada para imagens/metadados.
- OTServer files: fonte local ativa em `files_repository`.
- Manual: revisoes, mappings e allowlists.

## Scanners disponiveis

```bash
npm run datasource:verify
npm run datasource:scan-tibiavault-bestiary
npm run datasource:scan-tibiavault-npcs
```

O scanner do TibiaVault Bestiary gera apenas relatorios:

- `tibiavault-bestiary-index.json`
- `tibiavault-bestiary-coverage.json`
- `tibiavault-unmatched-monsters.json`

Ele nao importa nada para `ReinaDataService`.

O scanner do TibiaVault NPCs le a pagina publica, localiza o arquivo `npc-data.js`,
extrai o literal `_NPC_DATA` como texto e converte para relatorios locais sem executar o
JavaScript da fonte.

Relatorios:

- `source/web/src/reina-core/data-sources/generated/tibiavault-npcs-raw.json`
- `source/web/src/reina-core/data-sources/generated/tibiavault-npcs-normalized.json`
- `source/web/src/reina-core/data-sources/generated/tibiavault-npcs-coverage.json`
- `source/web/src/reina-core/data-sources/generated/tibiavault-npc-unresolved-items.json`

Esses arquivos servem para revisar NPCs, lojas e itens antes de qualquer promocao para
`npcs.json`, `npc-trades.json` ou importadores da base local.
