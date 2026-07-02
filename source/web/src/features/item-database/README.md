# Item Database

O Item Database segue o mesmo padrao arquitetural do Monster Database.

## Fonte dos dados

O servico usa o `ReinaDataService`, que carrega os JSONs gerados em:

- `source/web/src/reina-core/database/generated/items.json`
- `source/web/src/reina-core/database/generated/npc-sell-prices.json`
- `source/web/src/reina-core/database/generated/monster-loot.json`
- `source/web/src/reina-core/database/generated/monsters.json`

Como o `ReinaDataService` e `server-only`, a pagina nao importa a base grande em componentes client. A pagina usa a API `/api/items`, que retorna apenas a busca ou o item selecionado.

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

Nesta fase, quando um item possui preco em `npc-sell-prices.json`, ele aponta para `NPC Price Reference`, um registro agregado do NPC Hub. Isso evita inventar nomes de NPC antes dos shops reais serem importados.

Quando os importadores de NPC/shop extrairem dados reais dos arquivos Lua/XML, esses campos poderao listar NPCs reais sem mudar a API da tela.

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
