# ReinaHub Progress

Documento de acompanhamento das melhorias pedidas, etapas concluÃ­das e prÃ³ximos passos.

## Como usamos este arquivo

- Cada pedido importante vira um bloco de trabalho.
- Cada bloco possui status, progresso, pendÃªncias e prÃ³xima aÃ§Ã£o.
- ImplementaÃ§Ãµes novas devem atualizar este documento quando mudarem o roadmap.
- Este arquivo nÃ£o substitui documentaÃ§Ã£o tÃ©cnica detalhada; ele serve como quadro de progresso.

## Status

- `feito`: entregue e validado com build.
- `parcial`: jÃ¡ tem fundaÃ§Ã£o ou primeira versÃ£o, mas ainda falta completar.
- `pendente`: planejado, ainda nÃ£o implementado.
- `pausado`: ideia boa, mas nÃ£o Ã© prioridade agora.

## Bloco Atual: Market, Item Database, NPC, Spells e Imbuements

Pedido original:

> No Market Analyzer tem a opÃ§Ã£o de item. Ele poderia usar o mesmo sistema dos databases.
> Organizar o Item Database em weapons, potions, tools etc.
> Adicionar funÃ§Ãµes de NPC, Spells e Imbuements.

### Progresso

| Ãrea | Status | O que foi feito |
| --- | --- | --- |
| Market Analyzer usando Item Database | feito | Campo de item consulta `/api/items`, permite selecionar item local, preenche preÃ§o NPC quando existe, mostra sprite e salva `itemId`/imagem no histÃ³rico. |
| Item Database por categorias | feito | `ItemDatabaseService` usa taxonomia e devolve `category`, `slot`, `weaponType` e `classificationConfidence`. |
| Filtros na pÃ¡gina `/items` | feito | Filtros simples por `Weapons`, `Potions`, `Tools`, `Helmets`, `Armors`, `Legs`, `Shields`, `Creature Products`, `Currency` e `Runes`. |
| API de itens com categoria | feito | `/api/items?query=...&category=...` filtra usando a taxonomia. |
| Detalhe do item com classificaÃ§Ã£o | feito | Mostra categoria, slot, tipo de arma e confianÃ§a. |
| NPC integrado ao Item Database | parcial | Item com preco NPC mostra "Comprado por NPC Price Reference" e linka para `/npcs`; falta trocar referencia agregada por NPCs reais. |
| NPC Hub com itens relacionados | parcial | NPC Hub lista itens comprados e linka para Item Database; ainda usa referencia agregada. |
| Spell Database | pendente | Falta criar base, serviÃ§o, API, pÃ¡gina e relaÃ§Ã£o com NPC/vocaÃ§Ã£o. |
| Imbuement Database | pendente | Falta criar base, serviÃ§o, API, pÃ¡gina e cÃ¡lculo com creature products. |
| Market Analyzer com filtro por categoria | pendente | Hoje busca itens da base, mas ainda nÃ£o possui filtro de categoria no Market. |
| Taxonomia refinada | parcial | Existe taxonomia automÃ¡tica, mas ainda hÃ¡ muitos itens pendentes ou com confianÃ§a baixa. |

### Arquivos Principais

- `app/market/page.tsx`
- `app/api/items/route.ts`
- `source/web/src/features/item-database/`
- `source/web/src/reina-core/taxonomy/`
- `types/vault.ts`

### PrÃ³xima AÃ§Ã£o Recomendada

Importar/estruturar NPC shops reais.

Objetivo:

- No Item Database, mostrar quais NPCs compram/vendem o item.
- No NPC Hub, mostrar itens comprados/vendidos.
- Criar links internos entre `/items` e `/npcs`.
- Manter a tela simples e reaproveitar os serviÃ§os atuais.

## Bloco: Taxonomia e Banco Local Organizado

### Progresso

| Ãrea | Status | O que foi feito |
| --- | --- | --- |
| Classes de criaturas | feito | Criado `creature-classes.json` com 22 classes. |
| Categorias de itens | feito | Criado `item-categories.json`. |
| Tipos de armas | feito | Criado `weapon-types.json`. |
| Slots de equipamento | feito | Criado `equipment-slots.json`. |
| ServiÃ§o de taxonomia | feito | Criado `TaxonomyService`. |
| Classificador automÃ¡tico | feito | Criado `npm run taxonomy:classify`. |
| RelatÃ³rios gerados | feito | `classified-items`, `classified-monsters`, `unclassified-items`, `unclassified-monsters`, `taxonomy-report`. |
| CorreÃ§Ãµes manuais | parcial | Criado `manual-classifications.json`, ainda vazio. |

### PrÃ³ximas Melhorias

- Melhorar regras de classificaÃ§Ã£o de itens.
- Preencher `manual-classifications.json` com correÃ§Ãµes revisadas.
- Criar rotina para sugerir classificaÃ§Ãµes pendentes por fonte externa.

## Bloco: Monster Database

### Progresso

| Ãrea | Status | O que foi feito |
| --- | --- | --- |
| Estrutura de feature | feito | Criado `source/web/src/features/monster-database`. |
| ServiÃ§o | feito | `MonsterDatabaseService` usa `ReinaDataService`. |
| PÃ¡gina `/monsters` | feito | Pesquisa, seleÃ§Ã£o, detalhes, imagem, XP, vida e loot. |
| Links para Item Database | feito | Loot linka para `/items?itemId=...`. |
| Busca ranqueada | feito | Resultados exatos e prÃ³ximos aparecem antes de nomes que sÃ³ contÃªm a palavra no meio. |
| Assets de monstros | parcial | Importador organiza GIFs; ainda faltam muitos assets. |
| Economia no loot | feito | Mostra equivalÃªncia de loot para moeda premium usando CotaÃ§Ã£o Central. |

### PrÃ³ximas Melhorias

- Mostrar categoria/classe da criatura quando houver dado confiÃ¡vel.
- Integrar fontes externas para bestiary/classificaÃ§Ã£o com provenance.
- Melhorar lista de loot com filtros e preÃ§o total estimado.

## Bloco: Assets

### Progresso

| Ãrea | Status | O que foi feito |
| --- | --- | --- |
| Estrutura `public/assets` | feito | Criadas pastas de itens, monstros, NPCs, bosses e Ã­cones. |
| Asset Resolver | feito | Caminhos centralizados para itens e criaturas. |
| Scanner de assets | feito | `npm run assets:verify`. |
| Ranking de prioridade | feito | `npm run assets:priority` e `npm run assets:monster-priority`. |
| ImportaÃ§Ã£o segura da inbox | feito | `npm run assets:import-inbox`, lendo `files_repository/assets_inbox` e `files_repository/Imgs Assets`. |
| CorreÃ§Ã£o de ambiguidade item/monstro | feito | Nomes textuais que batem com item e monstro priorizam monstro; IDs numÃ©ricos continuam item. |

### PrÃ³ximas Melhorias

- Criar revisÃ£o de assets ambÃ­guos.
- Gerar relatÃ³rio de duplicatas por nome.
- Expandir suporte para PNG/WebP quando necessÃ¡rio.

## Bloco: Repository e Fontes Externas

### Progresso

| Ãrea | Status | O que foi feito |
| --- | --- | --- |
| Scanner Lua seguro | feito | `npm run repository:scan-lua`, apenas leitura. |
| RelatÃ³rios Lua | feito | Candidatos de NPC, monstros, shops e riscos. |
| HIGH risk review | feito | Allowlist e relatÃ³rio ativo. |
| PolÃ­tica de fontes | feito | `DATA_SOURCE_POLICY.md`. |
| TibiaVault Bestiary scan | feito | Scanner controlado de Ã­ndice, sem importar automaticamente para o app. |

### PrÃ³ximas Melhorias

- Criar pipeline de enrichment com provenance.
- Transformar candidatos Lua revisados em dados estruturados.
- Nunca depender de fonte externa em runtime.

## Roadmap Imediato

1. Importar/estruturar NPC shops reais.
2. Melhorar taxonomia manual de itens mais usados.
3. Adicionar filtro por categoria no Market Analyzer.
4. Criar base inicial de Spells.
5. Criar base inicial de Imbuements.

## O Que NÃ£o Fazer Agora

- NÃ£o criar redesign visual.
- NÃ£o importar dados externos automaticamente sem revisÃ£o.
- NÃ£o criar crawler agressivo.
- NÃ£o misturar arquivos brutos de `files_repository` com dados publicados do app.
- NÃ£o tentar resolver todas as categorias de itens de uma vez.

