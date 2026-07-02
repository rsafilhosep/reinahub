# ReinaHub Assets

Esta camada prepara imagens locais usadas pelo app, sem depender da pasta bruta de referencia.

## Onde colocar arquivos

- Itens: `public/assets/items/{itemId}.gif`
- Monstros: `public/assets/monsters/{normalized-name}.gif`
- NPCs: `public/assets/npcs/{normalized-name}.gif`
- Bosses: `public/assets/bosses/{normalized-name}.gif`
- Icones/fallbacks: `public/assets/icons/`

Tambem podem existir PNGs para organizacao futura, mas os resolvers atuais retornam `.gif` previsivel.

## Padrao de nomes

Itens usam ID numerico:

```text
public/assets/items/3031.gif
```

Criaturas, NPCs e bosses usam nome normalizado:

```text
Demon -> public/assets/monsters/demon.gif
Mooh'Tah Warrior -> public/assets/monsters/moohtah-warrior.gif
```

## Fallbacks

- Item ausente: `/assets/icons/missing-item.svg`
- Criatura/NPC/Boss ausente: `/assets/icons/missing-creature.svg`

## files_repository vs public/assets

`files_repository` e material bruto para estudo: dumps de OTServer, XMLs, Lua, SPR/DAT/OTB, pacotes e referencias. Nao deve ser executado nem usado diretamente pelo app.

`public/assets` e material limpo e publicado pelo Next.js. Somente imagens revisadas que o app pode servir devem entrar aqui.

## Importacao segura da inbox

Coloque GIFs/PNGs brutos em:

```text
files_repository/assets_inbox
```

O importador tambem le, quando existir:

```text
files_repository/Imgs Assets
```

Depois rode:

```bash
npm run assets:import-inbox
```

O script apenas le e copia imagens. Ele nao executa nenhum arquivo.

Ele tenta identificar cada imagem por:

- nome do arquivo igual ao `itemId`, exemplo `3031.gif`
- nome do arquivo igual ou parecido com o nome do item, exemplo `gold coin.gif`
- nome normalizado, exemplo `gold-coin.png`
- nome do arquivo igual ou parecido com o nome do monstro, exemplo `dragon.gif`

Quando encontra correspondencia de item, copia para:

```text
public/assets/items/{itemId}.gif
```

Quando encontra correspondencia de monstro, copia para:

```text
public/assets/monsters/{normalized-name}.gif
```

O arquivo original da inbox nao e apagado.

Relatorios gerados:

- `source/web/src/reina-core/assets/generated/imported-assets.json`
- `source/web/src/reina-core/assets/generated/unmatched-inbox-assets.json`

## Verificacao de assets

Rode:

```bash
npm run assets:verify
```

O scanner compara:

- `items.json` com `public/assets/items/{itemId}.gif`
- `monsters.json` com `public/assets/monsters/{normalized-name}.gif`

Tambem confirma a existencia das pastas base:

- `public/assets/items`
- `public/assets/monsters`
- `public/assets/npcs`
- `public/assets/bosses`

Os relatorios sao gerados em `source/web/src/reina-core/assets/generated/`:

- `assets-report.json`
- `missing-assets.json`

`assets-report.json` contem totais agregados. `missing-assets.json` contem a lista de imagens que ainda precisam ser adicionadas.

## Amostra inicial recomendada

Rode:

```bash
npm run assets:sample
```

Isso gera `source/web/src/reina-core/assets/generated/sample-assets-needed.json` com 50 itens prioritarios para testar os primeiros GIFs.

A lista prioriza:

- `gold coin`
- `platinum coin`
- `crystal coin`
- itens de loot recorrentes em `monster-loot.json`
- creature products comuns

Cada entrada traz:

- `itemId`
- `name`
- `expectedPath`

Esses 50 sao bons candidatos para preencher primeiro em `public/assets/items/{itemId}.gif` e validar o Hunt Analyzer com imagens reais.

## Ranking de prioridade por uso real

Rode:

```bash
npm run assets:priority
```

Isso gera:

- `assets-priority-report.json`
- `top-50-assets.json`
- `top-100-assets.json`
- `top-500-assets.json`

O ranking usa:

- frequencia em `monster-loot.json`
- existencia de preco em `npc-sell-prices.json`
- existencia da imagem em `public/assets/items/{itemId}.gif`
- bonus para moedas
- bonus para potions/supplies comuns
- bonus para creature products comuns

Campos principais:

- `itemId`
- `name`
- `lootOccurrenceCount`
- `hasNpcSellPrice`
- `sellPrice`
- `hasImage`
- `priorityScore`

## Ranking de prioridade de monstros

Rode:

```bash
npm run assets:monster-priority
```

Isso gera:

- `monster-assets-priority-report.json`
- `top-50-monster-assets.json`
- `top-100-monster-assets.json`

O ranking usa experiencia, vida e quantidade de entradas de loot para indicar quais GIFs de monstros procurar primeiro.
