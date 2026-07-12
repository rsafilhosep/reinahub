# ReinaHub Progress

Documento de acompanhamento das melhorias pedidas, etapas concluídas e próximos passos.

## Como usamos este arquivo

- Cada pedido importante vira um bloco de trabalho.
- Cada bloco possui status, progresso, pendências e próxima ação.
- Implementações novas devem atualizar este documento quando mudarem o roadmap.
- Este arquivo não substitui documentação técnica detalhada; ele serve como quadro de progresso.

## Status

- `feito`: entregue e validado com build.
- `parcial`: já tem fundação ou primeira versão, mas ainda falta completar.
- `pendente`: planejado, ainda não implementado.
- `pausado`: ideia boa, mas não é prioridade agora.

## Bloco Atual: Market, Item Database, NPC, Spells e Imbuements

Pedido original:

> No Market Analyzer tem a opção de item. Ele poderia usar o mesmo sistema dos databases.
> Organizar o Item Database em weapons, potions, tools etc.
> Adicionar funções de NPC, Spells e Imbuements.

### Progresso

| Área | Status | O que foi feito |
| --- | --- | --- |
| Market Analyzer usando Item Database | feito | Campo de item consulta `/api/items`, permite selecionar item local, preenche preço NPC quando existe, mostra sprite e salva `itemId`/imagem no histórico. |
| Market Economy Service | feito | Criado `MarketEconomyService` para centralizar calculo NPC vs Market, conversao por Cotacao Central e historico local, reduzindo regra economica dentro de `/market`. |
| Fontes manuais de preco | feito | Cotacao Central permite cadastrar fontes manuais/oficiais por servidor, sem nomes predefinidos de revendedores; o usuario pode aplicar uma fonte na cotacao ativa. |
| Item Database por categorias | feito | `ItemDatabaseService` usa taxonomia e devolve `category`, `slot`, `weaponType` e `classificationConfidence`. |
| Filtros na página `/items` | feito | Filtros simples por `Weapons`, `Potions`, `Tools`, `Helmets`, `Armors`, `Legs`, `Shields`, `Creature Products`, `Currency` e `Runes`. |
| API de itens com categoria | feito | `/api/items?query=...&category=...` filtra usando a taxonomia. |
| ItemSearchClientService | feito | Criado service client para centralizar busca/detalhe via `/api/items`; Market Analyzer e Item Database passaram a usar a mesma entrada. |
| Detalhe do item com classificação | feito | Mostra categoria, slot, tipo de arma e confiança. |
| NPC shops reais importados | feito | `npm run database:import-npc-trades` gera `npcs.json` e `npc-trades.json` a partir de Lua lido como texto, sem executar scripts. |
| NPC integrado ao Item Database | feito | Item Database lista NPCs reais que compram/vendem o item usando `npc-trades.json`; `NPC Price Reference` ficou como fallback. |
| NPC Hub com itens relacionados | feito | NPC Hub pesquisa NPCs reais e lista itens comprados/vendidos com links para Item Database. |
| Revisao de NPC trades pendentes | feito | Gerado `unresolved-npc-trades-review.json`, agrupando 74 ocorrencias em 38 itens unicos e separando item ausente de alias para revisar. |
| Itens suplementares por NPC trade | feito | `npm run database:enrich-items` criou 38 itens com `clientId` e provenance; pendencias de NPC trades cairam de 74 para 0. |
| Spell Database | pendente | Falta criar base, serviço, API, página e relação com NPC/vocação. |
| Premium Goals | parcial | Criada feature `/premium-goals` com catalogo placeholder, override de custo por servidor e calculo de quanto falta em moeda premium, gold e reais. |
| Stash | parcial | Criada feature `/stash` para inventario pessoal manual, usando Item Database, StorageService e Cotacao Central para calcular patrimonio em GC, moeda premium e reais; tabela permite editar quantidade/preco e ajustar estoque com botoes rapidos; OCR por print ficou preparado para fase futura. |
| Library Coverage | feito | Criado `npm run library:coverage`, consolidando cobertura de imagens, precos NPC, loot, NPC trades e materiais de imbuement para priorizar o que falta completar na biblioteca local. |
| Visual Identity Pass 1 | parcial | Criado `ModuleIcon` com sprites/icones por modulo; Home, HubNav e subtitulo do modulo ativo receberam sinais visuais leves; `BrandMark` substituiu o mark tecnico por emblema reutilizavel. |
| Imbuement Database | parcial | Criada feature `/imbuements`, API `/api/imbuements`, base manual revisada com 24 grupos de imbuement, tiers basic/intricate/powerful gerados pelo service, custo Market local por servidor, snapshots de preco, conversao pela Cotacao Central, drops por material, leitura comprar/farmar/revisar e verificador `npm run imbuements:verify`. |
| Consolidacao de interligacao | parcial | Criado `ImbuementMarketService` para centralizar storage, chaves, snapshots e calculos de Market usados por `/imbuements` e `/hunt`. |
| Data Flow documentado | feito | Criado `REINAHUB_DATA_FLOW.md` com fontes de verdade, fluxos entre modulos, fronteira server/client e checklist para novas features. |
| Architecture Verify | feito | Criado `npm run architecture:verify` para checar fetch manual de `/api/items`, barrels mistos client/server e imports client inseguros. |
| Market Analyzer com filtro por categoria | feito | Busca de item no Market agora filtra por `Weapons`, `Potions`, `Tools`, equipamentos, creature products, currency e runes usando `/api/items`. |
| Taxonomia refinada | parcial | Existe taxonomia automática, mas ainda há muitos itens pendentes ou com confiança baixa. |

### Arquivos Principais

- `app/market/page.tsx`
- `app/api/items/route.ts`
- `source/web/src/features/item-database/`
- `source/web/src/reina-core/taxonomy/`
- `types/vault.ts`

### Próxima Ação Recomendada

Melhorar simulacao economica dos Imbuements.

Objetivo:

- Melhorar custo de Market com historico futuro.
- Priorizar materiais com drops mais acessiveis e imagens disponiveis.
- Enriquecer materiais pendentes da base local, especialmente `concentrated demonic blood` e `swamp plant`.
- Proxima camada: criar presets por hunt/perfil e reaproveitar precos de imbuement no Hunt Analyzer.

## Bloco: Taxonomia e Banco Local Organizado

### Progresso

| Área | Status | O que foi feito |
| --- | --- | --- |
| Classes de criaturas | feito | Criado `creature-classes.json` com 22 classes. |
| Categorias de itens | feito | Criado `item-categories.json`. |
| Tipos de armas | feito | Criado `weapon-types.json`. |
| Slots de equipamento | feito | Criado `equipment-slots.json`. |
| Serviço de taxonomia | feito | Criado `TaxonomyService`. |
| Classificador automático | feito | Criado `npm run taxonomy:classify`. |
| Relatórios gerados | feito | `classified-items`, `classified-monsters`, `unclassified-items`, `unclassified-monsters`, `taxonomy-report`. |
| Correções manuais | parcial | Criado `manual-classifications.json`, ainda vazio. |

### Próximas Melhorias

- Melhorar regras de classificação de itens.
- Preencher `manual-classifications.json` com correções revisadas.
- Criar rotina para sugerir classificações pendentes por fonte externa.

## Bloco: Monster Database

### Progresso

| Área | Status | O que foi feito |
| --- | --- | --- |
| Estrutura de feature | feito | Criado `source/web/src/features/monster-database`. |
| Serviço | feito | `MonsterDatabaseService` usa `ReinaDataService`. |
| Página `/monsters` | feito | Pesquisa, seleção, detalhes, imagem, XP, vida e loot. |
| Links para Item Database | feito | Loot linka para `/items?itemId=...`. |
| Busca ranqueada | feito | Resultados exatos e próximos aparecem antes de nomes que só contêm a palavra no meio. |
| Assets de monstros | parcial | Importador organiza GIFs; ainda faltam muitos assets. |
| Economia no loot | feito | Mostra equivalência de loot para moeda premium usando Cotação Central. |

### Próximas Melhorias

- Mostrar categoria/classe da criatura quando houver dado confiável.
- Integrar fontes externas para bestiary/classificação com provenance.
- Melhorar lista de loot com filtros e preço total estimado.

## Bloco: Hunt Analyzer

### Progresso

| �rea | Status | O que foi feito |
| --- | --- | --- |
| Importar JSON de hunt | feito | Hunt Analyzer aceita arquivo `.json` e envia para `/api/hunt/summary`. |
| Importar TXT de hunt | feito | Upload agora aceita `.txt` e tenta converter texto copiado do jogo. |
| Colar texto da hunt | feito | Adicionado campo para colar `Session data`, `Killed Monsters` e `Looted Items` diretamente. |
| Enriquecimento de loot | feito | Itens da hunt usam `ReinaDataService`, pre�o NPC, status matched/unmatched e imagem futura. |
| Imbuements na hunt | parcial | Resumo server-side identifica loot que tambem e material de imbuement, agrega imbuements relacionados, exibe aba discreta `imbuements` e calcula valor dos materiais com preco de Market salvo por servidor. |
| Hunt Economy Service | parcial | Criado `HuntEconomyService` para centralizar conversao do balance e valor de materiais de imbuement usando `ImbuementMarketService`, reduzindo regra economica dentro da pagina `/hunt`. |
| Links internos da hunt | feito | Monstros mortos abrem `/monsters`, itens lootados abrem `/items` quando possuem `itemId` e imbuements relacionados abrem `/imbuements`. |
| Debug de itens nao encontrados | feito | Hunt Analyzer mostra aba discreta `debug` quando ha loot sem match na base local, exibindo nome original, nome normalizado e quantidade; tambem exporta JSON de revisao manual. |
| Revisao de unmatched loot | feito | Criado `npm run hunt:review-unmatched`, lendo `files_repository/hunt_unmatched_reviews` e gerando relatorios de candidatos a alias sem alterar mappings automaticamente. |
| Exportar PNG/PDF | feito | Card de exportacao recebeu identidade ReinaHub, destaque de balance/conversao, resumo rapido, metricas em grid e imagens de loot quando disponiveis. |

### Pr�ximas Melhorias

- Permitir revisar/corrigir item n�o encontrado e salvar mapping manual.
- Melhorar parser para varia��es futuras do texto copiado do client.
- Proxima melhoria: permitir abrir o Imbuement Database a partir de um material encontrado na hunt.
## Bloco: Assets

### Progresso

| Área | Status | O que foi feito |
| --- | --- | --- |
| Estrutura `public/assets` | feito | Criadas pastas de itens, monstros, NPCs, bosses e ícones. |
| Asset Resolver | feito | Caminhos centralizados para itens e criaturas. |
| Scanner de assets | feito | `npm run assets:verify`. |
| Ranking de prioridade | feito | `npm run assets:priority` e `npm run assets:monster-priority`. |
| Importação segura da inbox | feito | `npm run assets:import-inbox`, lendo `files_repository/assets_inbox` e `files_repository/Imgs Assets`. |
| Correção de ambiguidade item/monstro | feito | Nomes textuais que batem com item e monstro priorizam monstro; IDs numéricos continuam item. |
| Asset aliases e revisao | feito | Criado `asset-aliases.json`; importador reconhece itens suplementares/NPCs e gera `unmatched-assets-review.json`. |

### Próximas Melhorias

- Revisar `unmatched-assets-review.json` e adicionar aliases seguros.
- Gerar relatório de duplicatas por alvo.
- Expandir suporte para PNG/WebP quando necessário.

## Bloco: Repository e Fontes Externas

### Progresso

| Área | Status | O que foi feito |
| --- | --- | --- |
| Scanner Lua seguro | feito | `npm run repository:scan-lua`, apenas leitura. |
| Relatórios Lua | feito | Candidatos de NPC, monstros, shops e riscos. |
| HIGH risk review | feito | Allowlist e relatório ativo. |
| Política de fontes | feito | `DATA_SOURCE_POLICY.md`. |
| TibiaVault Bestiary scan | feito | Scanner controlado de índice, sem importar automaticamente para o app. |

### Próximas Melhorias

- Criar pipeline de enrichment com provenance.
- Transformar candidatos Lua revisados em dados estruturados.
- Nunca depender de fonte externa em runtime.

## Bloco: Ajustes 04/07/2026

Documento base:

- `AJUSTES_04072026.md`

### Progresso

| Area | Status | O que foi feito |
| --- | --- | --- |
| PDF de ajustes | feito | PDF `ajustes 04072026.pdf` foi analisado e transformado em backlog por partes. |
| Help on/off | parcial | Criado Help System reutilizavel com `HelpToggle`, `HelpTip` e preferencia salva via `StorageService`; aplicado primeiro na Calculadora RC. |
| Revisao da Calculadora RC | parcial | Calculos principais foram centralizados em `RcCalculatorService`; campos duvidosos receberam ajuda contextual e labels mais claros. |
| Item Database recolhivel | feito | Detalhe do item agora separa NPCs que compram, NPCs que vendem e monstros que dropam em blocos recolhiveis; NPCs ordenam por preco e filtram por cidade; ao selecionar item a tela rola para os detalhes. |
| Hunt History | parcial | Hunts processadas agora sao salvas localmente; historico lista/abre/remove sessoes, filtra por periodo, mostra totais gerais, ranking de itens/monstros com filtros, comparacao entre duas hunts, comparacao de item/monstro especifico e graficos de balance/XP-h. |
| Exportacao de hunts | parcial | PNG/PDF agora usam template proprio com servidor, sessao, balance, moeda premium, reais, KPIs, top monstros, top loot e materiais de imbuement. |
| Enriquecimento externo de precos | pendente | Criar pipeline com provenance para TibiaVault/TibiaWiki/Fandom, sem depender de fonte externa em runtime. |
| Espacos para anuncios | feito | Criado `AdSlot`, registro de posicoes permitidas e flag `NEXT_PUBLIC_REINAHUB_ADS_ENABLED`; anuncios seguem desligados por padrao e sem scripts externos. |

### Proxima Acao Recomendada

Refinar Hunt History com graficos por item/monstro.

Motivo:

- Calculadora RC e Item Database ja receberam os ajustes de baixo risco do PDF;
- Hunt History ja salva, reabre, filtra por periodo, compara, mostra graficos simples, analisa itens/monstros recorrentes e compara entidades especificas;
- Exportacao ja tem um template mais informativo;
- o proximo ganho real e gerar graficos por item/monstro especifico.

## Bloco: Profiles, Stash Compare e Live Goal

### Progresso

| Area | Status | O que foi feito |
| --- | --- | --- |
| ProfileService | parcial | Criado `source/web/src/reina-core/profiles/profile-service.ts` para separar contexto de jogador/personagem do catalogo de cotacoes. |
| Profile Selector | parcial | Stash recebeu seletor/criador de perfil ativo, vinculado a servidor/mundo. |
| Stash por perfil | parcial | Itens do Stash agora sao salvos por perfil ativo, com migracao automatica dos dados antigos. |
| Live Goal | parcial | Criada rota `/live-goal` com formulario, preview, progresso salvo, abrir overlay e copiar link; criada rota limpa `/overlay-goal` para OBS/live. |
| Comparativo por cotacao | feito | Stash compara os mesmos itens do perfil ativo usando outra cotacao cadastrada, mostrando diferenca em moeda premium e R$. |
| Modais de cadastro | feito | Cotacao Central agora abre cadastro/edicao de servidor em janela; Stash abre adicionar/editar item em janela e a tabela ficou menos poluida. |
| Multiplos objetivos | pendente | Live Goal ja salva estrutura de lista, mas a interface ainda mostra apenas objetivo ativo. |
| Catalogo de mundos | feito | Criado `npm run worlds:refresh`, gerando catalogo local com Tibia Global, RubinOT e DeusOT para preencher o cadastro de servidores sem fetch em runtime. |

### Proximas Melhorias

- Fazer Premium Goals e Live Goal respeitarem perfil ativo quando fizer sentido.
- Permitir selecionar imagem local de item/asset no Live Goal.
- Criar presets de objetivos por perfil.
- Amarrar Hunt History ao perfil ativo.

## Bloco: Revisao 2026-07-07

### Progresso

| Area | Status | O que foi feito |
| --- | --- | --- |
| Revisao critica | feito | Criado `REINAHUB_REVIEW_2026_07_07.md` com estado atual, pontos fortes, riscos, projetos abertos e roadmap recomendado. |
| Verificacoes | feito | `architecture:verify`, `database:verify`, `assets:verify` e `build` passaram durante a revisao. |

### Proxima Acao Recomendada

Fazer Premium Goals e Live Goal respeitarem perfil ativo quando fizer sentido, mantendo cotacao e patrimonio separados.

## Bloco: Legal, Isencao e Creditos

### Progresso

| Area | Status | O que foi feito |
| --- | --- | --- |
| Isencao de responsabilidade | feito | Criada rota `/disclaimer` com aviso de projeto independente, limites das estimativas, uso das ferramentas e fontes. |
| Aviso Tibia/CipSoft | feito | Incluido aviso de que Tibia� e marca registrada da CipSoft GmbH e que o ReinaHub nao possui afiliacao ou aprovacao oficial. |
| Link global | feito | Rodape global agora possui link discreto para a pagina de isencao. |

### Proximas Melhorias

- Criar politica de privacidade quando houver coleta de dados alem do localStorage.
- Criar termos de uso quando o projeto for publicado.
- Expandir creditos detalhados das fontes usadas nos importadores.

## Roadmap Imediato

1. Fazer Premium Goals e Live Goal respeitarem perfil ativo quando fizer sentido.
2. Melhorar cobertura de imagens de itens prioritarios.
3. Expandir Imbuements com mais tipos e protecoes elementais.
4. Melhorar taxonomia manual de itens mais usados.
5. Amarrar Hunt History ao perfil ativo.

## O Que Não Fazer Agora

- Não criar redesign visual.
- Não importar dados externos automaticamente sem revisão.
- Não criar crawler agressivo.
- Não misturar arquivos brutos de `files_repository` com dados publicados do app.
- Não tentar resolver todas as categorias de itens de uma vez.
