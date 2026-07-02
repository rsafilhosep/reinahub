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
```

O scanner do TibiaVault Bestiary gera apenas relatorios:

- `tibiavault-bestiary-index.json`
- `tibiavault-bestiary-coverage.json`
- `tibiavault-unmatched-monsters.json`

Ele nao importa nada para `ReinaDataService`.
