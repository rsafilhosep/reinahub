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
- `npc-sell-prices.json`
- `monsters.json`
- `monster-loot.json`
- `validation-report.json`
- `unresolved-items.json`

## Data cleaning e mappings

Use `manual-mappings.json` para corrigir nomes antigos, singular/plural, apostrofos ausentes e aliases seguros.

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
