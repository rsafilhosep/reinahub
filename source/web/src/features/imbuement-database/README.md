# Imbuement Database

Feature inicial para consultar imbuements, materiais e custo via preco NPC.

## Fonte dos dados

A primeira base fica em:

`source/web/src/features/imbuement-database/data/imbuements.json`

Ela e manual, pequena e auditavel. Nao usa crawler e nao depende de site externo em runtime. A receita inicial foi revisada a partir do guia de imbuements do TibiaVault e salva como dado local do ReinaHub, para nao deixar o app refem de fonte externa.

O JSON guarda a receita completa do tier `powerful`. O `ImbuementDatabaseService` gera automaticamente os tiers `basic` e `intricate` usando os primeiros materiais da receita, mantendo a fonte enxuta.

Atualmente a base cobre 24 grupos de imbuements:

- Vampirism, Void e Strike
- Scorch, Frost, Electrify, Venom e Reap
- Bash, Chop, Slash, Precision, Epiphany, Blockade e Punch
- Lich Shroud, Snake Skin, Dragon Hide, Quara Scale, Cloud Fabric e Demon Presence
- Swiftness, Vibrancy e Featherweight

## Como funciona

`ImbuementDatabaseService` resolve cada material usando `ReinaDataService`.

Para cada material, o servico tenta preencher:

- `itemId`
- nome resolvido
- preco NPC
- custo total do material
- imagem via asset resolver
- link para Item Database
- monstros que dropam o material, usando Item Database
- `dataStatus`

Na tela, o usuario tambem pode preencher preco unitario de Market para cada material. Esses valores ficam apenas no `localStorage`, usando `StorageService`, e nao alteram a base canonica.

Os precos de Market sao salvos por servidor ativo da Cotacao Central. Isso evita misturar valores de mundos diferentes. Se ainda nao existir preco salvo para o servidor atual, a tela tenta ler o formato antigo como fallback.

A simulacao economica usa esses precos locais de Market para calcular:

- custo total em gp
- equivalencia na moeda premium do servidor ativo
- equivalencia em reais pela Cotacao Central
- quantidade de materiais com preco de Market
- quantidade de materiais com fontes de drop locais
- leitura por material: comprar, farmar, precificar ou revisar dados

Tambem e possivel salvar snapshots locais do custo total por imbuement e servidor. Esses snapshots ficam no `localStorage` e servem para comparar variacao de preco entre revisoes manuais.

## Servicos compartilhados

A feature possui dois servicos principais:

- `ImbuementDatabaseService`: server-side, consulta receitas, materiais, itens relacionados e relacao item -> imbuements.
- `ImbuementMarketService`: client-side, centraliza localStorage, chaves de preco por servidor, snapshots e calculos de custo Market.

Paginas como `/imbuements` e `/hunt` devem consumir `ImbuementMarketService` para ler os mesmos precos e evitar duplicacao de regra entre telas.

O preco NPC aparece como referencia da base local. Para materiais de imbuement, ele nao deve ser tratado automaticamente como custo real de compra, porque muitos materiais sao negociados por Market ou farmados.

## API

`/api/imbuements`

Parametros:

- `query`: busca por nome, grupo ou tier.
- `id`: abre um imbuement especifico.
- `tier`: filtra por `basic`, `intricate` ou `powerful`.

## Verificacao

Rode:

`npm run imbuements:verify`

O comando gera:

- `source/web/src/features/imbuement-database/generated/imbuements-report.json`
- `source/web/src/features/imbuement-database/generated/unmatched-imbuement-materials.json`

O relatorio compara os materiais dos imbuements com `items.json` e `supplemental-items.json`.

Pendencias conhecidas da base local:

- `concentrated demonic blood`
- `swamp plant`

Esses nomes continuam no relatorio ate encontrarmos IDs confiaveis ou uma fonte local revisada.

## Uso futuro

A feature esta preparada para evoluir para:

- custo de market
- persistencia local de precos revisados
- historico de preco
- simulacao de profit por hunt/material
- vocacoes
- slots de equipamento
- NPC de imbuement
- wiki/provenance externa revisada

## Integracao com Hunt Analyzer

Parte 1 concluida: o `ImbuementDatabaseService` expoe `getImbuementsUsingItem`, permitindo que o servidor identifique se um item lootado tambem e material de imbuement.

O `Hunt Analyzer` ja recebe, no resumo server-side:

- `imbuementUsages` por item de loot
- `isImbuementMaterial`
- `imbuementSummary`
- `imbuementLootItems`

A exibicao visual desses dados deve ser feita em etapa separada, mantendo a tela atual.
