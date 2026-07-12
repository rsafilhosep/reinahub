# NPC HUB

O NPC HUB e o ponto central para informacoes e relacoes envolvendo NPCs no ReinaHub.

Ele segue o mesmo padrao arquitetural de Item Database e Monster Database:

- `components/`
- `hooks/`
- `services/`
- `types/`
- `utils/`

## Fonte dos dados

O `NpcHubService` usa o `ReinaDataService` e consome:

- `npcs.json`
- `npc-trades.json`
- `npc-sell-prices.json`

`npcs.json` e `npc-trades.json` sao gerados a partir dos shops Lua do OTServer, sempre por leitura de texto e sem executar scripts.

`NPC Price Reference` continua existindo apenas como fallback agregado para itens que possuem preco em `npc-sell-prices.json`, mas ainda nao possuem relacao real com um NPC importado.

## Servico

O servico fica em:

`source/web/src/features/npc-hub/services/npc-hub-service.ts`

Metodos disponiveis:

- `getNpc(name)`
- `searchNpcs(query)`
- `getItemsBought(npc)`
- `getItemsSold(npc)`
- `getNpcImage(name)`
- `getNpcLocation(name)`

## Assets

As imagens passam pelo resolver central:

- `getNpcImagePath(name)`
- `getItemImagePath(itemId)`

Quando uma imagem ainda nao existe, a interface usa placeholder.

## Preparacao futura

Cada NPC ja retorna um bloco `future` com:

- city
- coordinates
- map
- travel
- quests
- bless
- promotion
- boat
- carpet
- bank
- mail
- guild
- outfits
- mounts
- imbuements
- forge
- dailyTasks

## Relacionamentos

O NPC HUB ja retorna itens relacionados com `itemHref`, preparado para abrir o Item Database.

O Item Database tambem ja aponta de volta para o NPC HUB por meio de `boughtByNpcs` e `soldByNpcs`.

Nesta fase, os itens com trades reais ja apontam para NPCs reais. Quando nao houver relacao real, o Item Database ainda pode usar `NPC Price Reference` como fallback seguro.

Com essa base, o Item Database pode mostrar:

- comprado por;
- vendido por;
- servicos relacionados;
- links para `/npcs?npc={name}`.
