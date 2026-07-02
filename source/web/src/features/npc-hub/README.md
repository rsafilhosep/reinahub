# NPC HUB

O NPC HUB e o ponto central para informacoes e relacoes envolvendo NPCs no ReinaHub.

Ele segue o mesmo padrao arquitetural de Item Database e Monster Database:

- `components/`
- `hooks/`
- `services/`
- `types/`
- `utils/`

## Fonte dos dados

Nesta fase inicial, o `NpcHubService` usa o `ReinaDataService` e a base `npc-sell-prices.json` para representar uma lista agregada de precos de NPC comprador.

Os dados atuais ainda nao possuem nomes reais de NPC por item. Por isso, o hub cria o registro inicial `NPC Price Reference`, que serve como ponte ate os importadores de NPC reais ficarem prontos.

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

Nesta fase, os itens com preco NPC apontam para `NPC Price Reference`, porque a base atual ainda nao possui nomes reais de NPC por item.

Quando a base passar a guardar NPCs reais por item, o Item Database podera mostrar:

- comprado por;
- vendido por;
- servicos relacionados;
- links para `/npcs?npc={name}`.
