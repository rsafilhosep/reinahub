# Monster Database

O Monster Database e a primeira camada reutilizavel de criaturas do ReinaHub.

## Fonte dos dados

O servico usa o `ReinaDataService`, que carrega os JSONs gerados em:

- `source/web/src/reina-core/database/generated/monsters.json`
- `source/web/src/reina-core/database/generated/monster-loot.json`
- `source/web/src/reina-core/database/generated/items.json`
- `source/web/src/reina-core/database/generated/npc-sell-prices.json`

Como o `ReinaDataService` e `server-only`, a feature nao importa a base grande em componentes client. A pagina usa a API `/api/monsters`, que retorna apenas os resultados e detalhes necessarios.

## Assets

As imagens passam pelo asset resolver central:

- monstros: `getMonsterImagePath(monsterName)`
- itens: `getItemImagePath(itemId)`

O servico tambem verifica se o arquivo existe em `public/assets` e retorna `exists`/`hasImage`. A tela sempre usa fallback visual quando uma imagem ainda nao foi adicionada.

## Servico

O `MonsterDatabaseService` fica em:

`source/web/src/features/monster-database/services/monster-database-service.ts`

Metodos disponiveis:

- `getMonster(name)`
- `searchMonsters(query)`
- `getLoot(monsterName)`
- `getRelatedItems(monsterName)`
- `getMonsterImage(monsterName)`

## Preparacao futura

Cada monstro ja retorna um bloco `future` vazio para evoluir sem quebrar a API:

- Bestiary
- Charms
- Spawn
- Respawn
- Resistencias
- Fraquezas
- Boss relacionado
- Localizacao
- Mapa
- Estrategias
- Vocacoes recomendadas
- Profit medio

## Reuso por outras ferramentas

Ferramentas futuras como Hunt Analyzer, Loot Analyzer, Calculadora de Profit, Bestiary, Charms, Bosses e Quests devem consumir o `MonsterDatabaseService` no servidor ou uma API fina baseada nele.

Evite montar caminhos de imagens manualmente e evite importar JSONs gerados diretamente em componentes client.
