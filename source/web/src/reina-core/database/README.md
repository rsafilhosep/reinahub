# ReinaHub Local Database

Esta pasta prepara a base local reutilizavel do ReinaHub. Ela nao altera telas, layout ou componentes visuais.

## Origem dos dados

- `items.xml`: pacote do servidor Tibia/OTServer, com IDs, nomes e `clientId` quando existir.
- XML de NPC comprador: lista de itens vendidos ao NPC e seus precos de venda.
- Monsters XML: arquivos de monstros do servidor, com experiencia, vida, velocidade e loot.

## Como rodar

```bash
npm run database:import -- --items "caminho/para/items.xml" --npc "caminho/para/npc.xml" --monsters "caminho/para/monsters"
```

`--monsters` pode apontar para um arquivo XML/Lua ou para uma pasta. Quando for pasta, o importador varre XML e Lua recursivamente. Os arquivos Lua sao lidos como texto; eles nao sao executados.

Exemplo com a pasta de referencia local:

```bash
npm run database:import -- --items "E:\Reina Hub II\files_repository\06_30_2026\crystalserver-main\data\items\items.xml" --npc "E:\Reina Hub II\files_repository\06_30_2026\npc compra tudo.xml" --monsters "E:\Reina Hub II\files_repository\06_30_2026\crystalserver-main\data-global\monster"
```

## Arquivos gerados

Os JSONs ficam em `source/web/src/reina-core/database/generated/`:

- `items.json`
- `supplemental-items.json`
- `supplemental-items-pending-review.json`
- `supplemental-items-report.json`
- `npc-sell-prices.json`
- `npcs.json`
- `npc-trades.json`
- `monsters.json`
- `monster-loot.json`
- `validation-report.json`
- `unresolved-items.json`
- `unresolved-npc-trades.json`
- `unresolved-npc-trades-review.json`
- `npc-trades-report.json`

## NPC shops em Lua

Os shops reais de NPC podem ser extraidos dos arquivos Lua do OTServer com:

```bash
npm run database:import-npc-trades
```

Esse processo procura arquivos `.lua` em `files_repository/06_30_2026/crystalserver-main/data-global/npc`, le os arquivos apenas como texto e nunca executa Lua.

Arquivos gerados:

- `npcs.json`: NPCs encontrados.
- `npc-trades.json`: itens comprados/vendidos por NPC.
- `unresolved-npc-trades.json`: trades que ainda nao casaram com `items.json`.
- `unresolved-npc-trades-review.json`: pendencias agrupadas por item para revisao manual.
- `npc-trades-report.json`: resumo do importador.

Convencao usada:

- `npcBuys`: o NPC compra o item do jogador.
- `npcSells`: o NPC vende o item para o jogador.

Na primeira importacao real foram encontrados 281 NPCs e 12.108 trades. O enriquecimento suplementar resolveu os itens ausentes e as pendencias atuais de NPC trades ficaram em 0.

O campo `suggestedAction` ajuda a separar:

- `missing-item-source`: o shop trouxe `clientId`, mas esse item ainda nao existe no `items.json`.
- `review-name-alias`: o shop trouxe apenas nome; precisa revisar se e alias seguro ou item novo.

## Promocao revisavel de NPCs do TibiaVault

Depois de rodar:

```bash
npm run datasource:scan-tibiavault-npcs
```

gere candidatos para a biblioteca local com:

```bash
npm run database:promote-tibiavault-npcs
```

e classifique conflitos/pendencias com:

```bash
npm run database:review-tibiavault-npcs
```

Depois gere a camada comparativa de fontes de preco com:

```bash
npm run database:npc-price-sources
```

Esse comando nao altera `npcs.json` nem `npc-trades.json`. Ele cria arquivos de revisao em
`source/web/src/reina-core/database/generated/`:

- `tibiavault-npc-candidates.json`: NPCs vindos do TibiaVault, marcados como novos ou merge candidates.
- `tibiavault-npc-trade-candidates.json`: compras/vendas resolvidas contra `items.json` e `supplemental-items.json`.
- `tibiavault-npc-promotion-unresolved-trades.json`: trades que ainda precisam de alias ou item suplementar.
- `tibiavault-npc-promotion-conflicts.json`: diferencas de preco contra trades locais ja existentes.
- `tibiavault-npc-promotion-report.json`: resumo da etapa.
- `tibiavault-npc-review-report.json`: conflitos classificados por severidade e sugestao de politica.
- `tibiavault-npc-mapping-candidates.json`: aliases sugeridos para revisao manual.
- `npc-trade-price-sources.json`: precos por fonte (`otserver-local`, `tibiavault-reference`).
- `npc-trade-price-sources-grouped.json`: precos agrupados por NPC + item + tipo de trade.
- `npc-trade-price-sources-report.json`: resumo da camada de fontes.

`NpcTradePriceSourceService` permite consultar esta camada sem mudar o comportamento atual
das ferramentas. Por padrao, `otserver-local` continua sendo a fonte ativa; TibiaVault fica
como referencia para comparacao e revisao.

Fluxo recomendado:

1. Revisar conflitos.
2. Revisar trades sem item correspondente.
3. Adicionar aliases ou supplemental items quando fizer sentido.
4. So depois promover para o importador canonico local.

## Itens suplementares

Quando um shop de NPC referencia um item com `clientId`, mas esse item ainda nao existe no `items.json`, use:

```bash
npm run database:enrich-items
```

Esse comando le `unresolved-npc-trades-review.json` e gera:

- `supplemental-items.json`: itens complementares com `id`, `clientId`, nome, preco NPC quando existir e provenance.
- `supplemental-items-pending-review.json`: itens sem `clientId`, que precisam de revisao manual.
- `supplemental-items-report.json`: resumo do enriquecimento.

Os itens suplementares nao substituem o `items.xml`. Eles sao uma camada complementar e auditavel. O `ReinaDataService` junta `items.json` + `supplemental-items.json` em memoria para consultas.

Na primeira rodada completa, 38 itens suplementares foram criados e as pendencias de NPC trades cairam de 74 para 0.

## Data cleaning e mappings

Use `manual-mappings.json` para corrigir nomes antigos, singular/plural, apostrofos ausentes, IDs/clientIds antigos e aliases seguros.

Formato:

```json
{
  "itemNameAliases": {
    "werewolf fang": "werewolf fangs"
  },
  "itemIdAliases": {
    "12345": "nome canonico do item"
  }
}
```

O importador tenta casar referencias nesta ordem:

1. `itemId`
2. `clientId`
3. nome normalizado
4. alias manual

## Validacoes

O importador gera alertas para:

- itens duplicados por nome
- IDs duplicados
- loot sem item correspondente
- precos de NPC sem item correspondente

O `validation-report.json` inclui:

- total resolvido automaticamente
- total resolvido por manual mapping
- pendencias restantes

O `unresolved-items.json` contem apenas itens ainda pendentes para revisao manual, agrupados por origem/item.

## Uso futuro

- Loot Analyzer: vai usar `items.json`, `npc-sell-prices.json` e `monster-loot.json` para precificar loot e identificar inconsistencias.
- Hunt Analyzer: vai enriquecer JSONs de hunt com nomes normalizados, precos de venda, loot esperado e metadados dos monstros.

## Camada de consulta

Use `ReinaDataService` para acessar a base local sem ler JSON manualmente:

```ts
import { ReinaDataService } from "@/source/web/src/reina-core/database";

const goldCoin = ReinaDataService.findItemByName("gold coin");
const demon = ReinaDataService.getMonsterByName("demon");
const demonLoot = ReinaDataService.getMonsterLoot("demon");
const sellPrice = ReinaDataService.getNpcSellPrice(goldCoin?.id ?? 0);
```

Funcoes disponiveis:

- `findItemById(id)`
- `findItemByName(name)`
- `getNpcSellPrice(itemId)`
- `getMonsterByName(name)`
- `getMonsterLoot(monsterName)`
- `searchItems(query)`
- `searchMonsters(query)`
- `getNpcByName(name)`
- `searchNpcs(query)`
- `getNpcTrades(npcName)`
- `getNpcTradesForItem(itemId)`

Para verificar a camada de consulta:

```bash
npm run database:verify
```

## Enriquecimento de loot de hunt

O processamento de hunt usa `enrichLootItem(item)` em `services/hunt-service.ts`.

Cada item de loot importado passa a carregar, quando houver match na base:

- `itemId`
- `normalizedName`
- `sellPrice`
- `totalSellValue`
- `imageItemId`
- `dataStatus: "matched" | "unmatched"`

O resumo da hunt tambem expõe `unmatchedLootItems` para debug interno. A tela atual nao foi alterada.
