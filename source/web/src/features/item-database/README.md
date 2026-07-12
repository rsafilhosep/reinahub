# Item Database

O Item Database segue o mesmo padrao arquitetural do Monster Database.

## Fonte dos dados

O servico usa o `ReinaDataService`, que carrega os JSONs gerados em:

- `source/web/src/reina-core/database/generated/items.json`
- `source/web/src/reina-core/database/generated/supplemental-items.json`
- `source/web/src/reina-core/database/generated/npc-sell-prices.json`
- `source/web/src/reina-core/database/generated/npcs.json`
- `source/web/src/reina-core/database/generated/npc-trades.json`
- `source/web/src/reina-core/database/generated/monster-loot.json`
- `source/web/src/reina-core/database/generated/monsters.json`

Como o `ReinaDataService` e `server-only`, a pagina nao importa a base grande em componentes client. A pagina usa a API `/api/items`, que retorna apenas a busca ou o item selecionado.

No client, buscas devem passar por `services/item-search-client-service.ts`.

Esse service centraliza:

- busca por query e categoria;
- detalhe por itemId;
- detalhe por nome;
- contrato de resposta da API `/api/items`.

Outras ferramentas, como Market Analyzer e futuras telas de loot/profit, devem usar esse service em vez de criar `fetch('/api/items')` manual.

`supplemental-items.json` complementa itens ausentes do `items.xml` quando ha evidencia em trades de NPC com `clientId`. A tela continua consumindo tudo pelo `ItemDatabaseService`, sem precisar saber se o item veio da base principal ou da base suplementar.

## Assets

As imagens passam pelo asset resolver central:

- itens: `getItemImagePath(itemId)`
- monstros que dropam: `getMonsterImagePath(monsterName)`

A tela usa fallback quando uma imagem ainda nao existe em `public/assets`.

## Servico

O `ItemDatabaseService` fica em:

`source/web/src/features/item-database/services/item-database-service.ts`

Metodos disponiveis:

- `getItem(itemId)`
- `getItemByName(name)`
- `searchItems(query)`
- `getNpcPrice(itemId)`
- `getBoughtBy(itemId)`
- `getSoldBy(itemId)`
- `getDroppedBy(itemId)`
- `getItemImage(itemId)`

## Relacao com NPC Hub

O Item Database ja retorna:

- `boughtByNpcs`
- `soldByNpcs`
- `boughtByNpcCount`
- `soldByNpcCount`

Agora o Item Database tenta primeiro usar `npc-trades.json` para listar NPCs reais que compram ou vendem o item.

Quando um item possui preco em `npc-sell-prices.json`, mas ainda nao possui trade real importado, ele aponta para `NPC Price Reference`, um registro agregado do NPC Hub. Isso preserva compatibilidade sem inventar nomes de NPC.

## Organizacao da tela

O detalhe do item organiza relacionamentos em blocos recolhiveis:

- NPCs que compram
- NPCs que vendem
- Monstros que dropam

As listas de NPC usam ordenacao util para decisao:

- compradores: maior preco primeiro
- vendedores: menor preco primeiro

Quando houver cidade no trade/NPC, a tela permite filtrar por cidade. Registros sem cidade aparecem como `Cidade pendente`.

## Preparacao futura

Cada item ja retorna um bloco `future` vazio para evoluir sem quebrar a API:

- Market
- Historico de preco
- NPC vendedor
- NPC comprador
- Quests
- Imbuements
- Bestiary
- Charms
- Crafts
- Trade
- Estatisticas

## Reuso por outras ferramentas

Ferramentas futuras como Market Analyzer, Loot Analyzer, Hunt Analyzer, Calculadora de Profit, Quests e Imbuements devem consumir o `ItemDatabaseService` no servidor ou uma API fina baseada nele.

Evite montar caminhos de imagens manualmente e evite importar JSONs gerados diretamente em componentes client.
