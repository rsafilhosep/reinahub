# REINAHUB REDUNDANCY AUDIT

Documento de auditoria para localizar dados duplicados, campos soltos, placeholders antigos e pontos que deveriam consumir uma fonte central do ReinaHub.

## 1. Objetivo

Evitar que o ReinaHub cresca em ilhas independentes.

A regra arquitetural desejada e:

- telas nao devem criar caminhos de asset manualmente;
- telas nao devem duplicar dados que ja existem em servicos centrais;
- cada contexto do jogador deve apontar para uma fonte unica;
- localStorage deve ser rastreavel e documentado;
- placeholders devem representar pendencia real, nao funcionalidade ja existente.

## 2. Achados Criticos

### 2.1 Dois sistemas de assets coexistem

Hoje existem dois resolvers:

- `services/image-resolver.ts`
- `source/web/src/reina-core/assets/asset-resolver.ts`

Problema:

- o resolver antigo usa `/images/...`;
- o resolver novo usa `/assets/...`;
- o resolver antigo depende de `source/assets/metadata/asset-manifest`;
- o resolver novo e o padrao real usado por Item/Monster/NPC/Stash/Hunt;
- alguns componentes ainda repetem fallback manualmente.

Risco:

- imagens diferentes em telas diferentes;
- quebra em componentes client/server;
- dificil saber qual sistema e oficial.

Recomendacao:

1. Tornar `source/web/src/reina-core/assets/asset-resolver.ts` a API oficial.
2. Criar uma versao client-safe se necessario.
3. Migrar consumidores de `services/image-resolver.ts`.
4. Deprecar ou remover `services/image-resolver.ts`.

Prioridade: Alta.

## 3. Contextos Duplicados

### 3.1 Servidor, perfil e personagem ainda se sobrepoem

Hoje existem:

- `quote-service.ts`: servidores/cotacoes.
- `world-catalog.json`: catalogo de mundos.
- `ProfileService`: contexto do jogador por servidor.
- `CharacterProfileService`: personagens, plataforma, mundo e linkedServerId.

Problema:

- personagem guarda `platform` e `world`;
- perfil guarda `serverId`;
- servidor guarda `plataforma` e `mundo`;
- Cotacao Central tambem usa `world-catalog.json`;
- a tela de Characters tambem usa `world-catalog.json`.

Isso e aceitavel como etapa inicial, mas a relacao correta deve ser:

```text
World Catalog -> Server Quote -> Reina Profile -> Character/Stash/Goals/Hunts
```

Recomendacao:

1. Personagem deve apontar para `profileId` ou `serverId`.
2. `platform/world` no personagem devem ser snapshot ou fallback, nao fonte principal.
3. Stash, Live Goal, Premium Goals e Hunt History devem evoluir para profile-aware.
4. Criar `ProfileContextService` ou expandir `ProfileService`.

Prioridade: Alta.

### 3.2 Stash ja usa perfil, mas outras features ainda nao

Stash ja usa `ProfileService`.

Outras areas ainda usam apenas servidor ativo:

- Hunt Analyzer.
- Market Analyzer.
- Premium Goals.
- Live Goal.
- Character Profile.

Risco:

- dados do RubinOT misturados com Yubra;
- metas e historico sem contexto de personagem;
- comparativos futuros ficam confusos.

Recomendacao:

1. Manter servidor ativo como fallback.
2. Introduzir profile ativo como contexto principal.
3. Ligar personagem ativo ao profile ativo.

Prioridade: Alta.

## 4. Storage Local Espalhado

Chaves encontradas:

- `vot_servers`
- `vot_active_server`
- `vot_quote_history`
- `vot_theme`
- `vot_sprite_cache`
- `vot_sprite_meta`
- `rc_history`
- `ma_history`
- `reinahub_profiles`
- `reinahub_active_profile`
- `reinahub_stash_items`
- `reinahub_character_profiles`
- `reinahub_active_character`
- `reinahub_live_goals`
- `reinahub_active_live_goal`
- `reinahub_manual_price_sources`
- `reinahub_help_enabled`
- `imbuement_market_prices`
- `imbuement_market_snapshots`
- `reinahub_hunt_history`
- `reinahub_premium_product_overrides`

Problema:

- nomes antigos `vot_*` convivem com `reinahub_*`;
- algumas chaves nao estao centralizadas;
- dificil criar export/import de configuracao no futuro.

Recomendacao:

Criar:

```text
source/web/src/reina-core/storage/storage-registry.ts
```

Com:

- nome da chave;
- dono;
- descricao;
- se e por profile;
- se pode ser limpo pelo usuario;
- versao/migracao.

Prioridade: Media.

## 5. Imports Diretos de JSON em Telas

Casos relevantes:

- `app/page.tsx` importa `items.json`, `monsters.json`, `npcs.json` e `assets-report.json`.
- `app/cotacao/page.tsx` importa `world-catalog.json`.
- `CharacterProfilePage` importa `world-catalog.json`.

Observacao:

No App Router, imports em Server Components podem ser aceitaveis, mas paginas client ou componentes client nao devem carregar JSON grande.

Risco:

- bundle client pesado;
- repeticao de logica de consulta;
- cada pagina conhece detalhes de generated JSON.

Recomendacao:

1. Home deve usar um `DashboardStatsService` server-side ou JSON pequeno de resumo.
2. Cotacao e Characters devem consumir `WorldCatalogService`.
3. Evitar importar JSON grande direto em componentes client.

Prioridade: Media.

## 6. Placeholders Que Ja Viraram Funcionalidade

Na Home ainda aparecem placeholders antigos:

- `NPC Database` como placeholder, embora `/npcs` exista.
- `Ultima atualizacao` como `-`.
- `Loot Analyzer (em breve)` no menu.
- blocos de `Historico`, `Exportacoes`, `Cards` ainda placeholders.

Recomendacao:

1. Atualizar card de NPC Database para apontar para `/npcs`.
2. Trocar `Ultima atualizacao` por data de algum report local.
3. Manter placeholders apenas onde realmente nao existe rota.
4. Criar uma lista oficial de modulos planejados.

Prioridade: Baixa/Media.

## 7. Pastas Vazias ou Semi-Vazias

Pasta vazia encontrada:

- `source/web/src/features/hunt-analyzer/generated`

Recomendacao:

- remover se nao for usada;
- ou documentar como destino futuro de reports/scripts.

Prioridade: Baixa.

## 8. Calculos Economicos

Ja existe:

- `goldToPremium`
- `premiumToBrl`
- `getActiveServer`
- `getServerDisplayName`

Mas calculos de economia aparecem em varias features:

- Hunt Analyzer.
- Stash.
- Market Analyzer.
- Imbuement Database.
- Live Goal.
- Monster Database.

Recomendacao:

Criar:

```text
source/web/src/reina-core/economy/pricing-service.ts
```

Responsabilidades:

- converter gold para moeda premium;
- converter moeda premium para R$;
- calcular valor unitario;
- resolver preco por prioridade: manual, market, NPC, fallback;
- retornar origem do preco.

Prioridade: Alta.

## 9. Normalizacao

Ja existe normalizacao em:

- `source/web/src/reina-core/database/normalize.ts`
- scripts de assets;
- scripts de database/importers;
- `services/image-resolver.ts`
- `LiveGoalCard` possui normalizacao local para monstro.

Problema:

- pequenas diferencas podem gerar slugs diferentes;
- ja houve caso de resolver server-only entrando em componente client.

Recomendacao:

Criar uma normalizacao client-safe comum:

```text
source/web/src/reina-core/shared/normalizers.ts
```

Ou dividir:

- `database/normalize.ts` para entidades.
- `assets/asset-normalizer.ts` sem import server-only.

Prioridade: Media/Alta.

## 10. Relacoes Que Precisam Ser Consolidadas

### Item

Fonte central desejada:

- `ItemDatabaseService`
- `ReinaDataService`
- `AssetResolver`
- `PricingService`

Consumidores:

- Item Database.
- Market Analyzer.
- Stash.
- Hunt Analyzer.
- Monster Database loot.
- NPC Hub.
- Imbuement Database.

### Monster

Fonte central desejada:

- `MonsterDatabaseService`
- `ReinaDataService`
- `AssetResolver`
- `TaxonomyService`

Consumidores:

- Monster Database.
- Hunt Analyzer.
- Live Goal criatura.
- Bestiary futuro.

### NPC

Fonte central desejada:

- `NpcHubService`
- `ReinaDataService`
- `NPC trade price sources`

Consumidores:

- Item Database.
- NPC Hub.
- Market/Stash precificacao.

### Character/Profile

Fonte central desejada:

- `ProfileService`
- `CharacterProfileService`
- futuro `ProfileContextService`

Consumidores:

- Stash.
- Hunt History.
- Live Goal.
- Premium Goals.
- Character Profile.
- Market Analyzer.

## 11. Ordem Recomendada de Correcao

### Fase 1 - Consolidar Assets

1. Criar resolver client-safe oficial.
2. Remover repeticao de fallbacks.
3. Migrar `LiveGoalCard`, `Market`, `Stash`, `Item`, `Monster`, `NPC`, `Imbuement`.
4. Deprecar `services/image-resolver.ts`.

### Fase 2 - Consolidar Perfil

1. Definir se personagem aponta para `profileId` ou `serverId`.
2. Fazer Character Profile criar/usar profile.
3. Tornar Live Goal e Premium Goals profile-aware.
4. Garantir que Stash, Hunt e Market usem o mesmo contexto.

### Fase 3 - PricingService

1. Centralizar conversoes.
2. Centralizar origem de preco.
3. Usar em Stash, Market, Hunt, Monster, Item e Imbuement.

### Fase 4 - Storage Registry

1. Criar registro das chaves.
2. Documentar dono e migracao.
3. Preparar export/import de configuracoes locais.

### Fase 5 - Limpeza de Home e Placeholders

1. Atualizar cards que ja existem.
2. Remover placeholders enganosos.
3. Exibir datas reais de reports.

## 12. O Que Nao Fazer Agora

- Nao remover campos de personagem ainda.
- Nao apagar chaves antigas sem migracao.
- Nao refatorar todas as telas ao mesmo tempo.
- Nao mexer em visual global antes de consolidar os servicos.
- Nao tentar automatizar todas as fontes externas antes da base local ficar coerente.

## 13. Proxima Acao Recomendada

Comecar pela Fase 1:

```text
Consolidar Assets
```

Motivo:

- e uma redundancia clara;
- ja causou erro real de build/client-server;
- afeta quase todas as telas;
- melhora estabilidade sem mudar regra de negocio;
- reduz strings manuais como `/assets/...` espalhadas.

