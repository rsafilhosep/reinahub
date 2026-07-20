# ReinaHub Data Link Audit

Data: 2026-07-17

Objetivo: identificar campos que hoje pedem preenchimento manual, mas poderiam ser preenchidos, sugeridos ou sincronizados a partir de dados que o ReinaHub ja possui.

## Fontes centrais ja existentes

- `ReinaActiveContextService`: perfil ativo, servidor ativo, personagem ativo.
- `ReinaEconomyService`: cotacao ativa, moeda premium, gold por moeda, conversoes GC/TC/RC/R$.
- `ReinaDataService`: itens, monstros, loots, NPC sell prices.
- `PremiumGoalsService`: catalogo de produtos premium, overrides por servidor, progresso salvo.
- `CharacterProfileService`: personagem, level, XP atual, level alvo, tabela de experiencia.
- `HuntHistoryService`: hunts salvas por contexto ativo, XP/h, balance, loot, monsters.
- `StashService`: itens do stash por perfil, quantidade, preco, patrimonio.
- `ItemSearchClientService`: busca de itens com imagem, categoria e NPC price.

## Achados principais

### 1. Calculadora RC e Ferramenta Rapida ainda duplicam alguns calculos

Estado atual:
- Calculadora RC le a cotacao ativa e preenche `precoPacote` e `cotacao`.
- Ferramenta Rapida tambem calcula gold, moeda premium e R$ usando `ReinaEconomyService`.
- As duas telas mantem campos proprios para valores temporarios.

Melhoria sugerida:
- Criar um pequeno `ConversionDraftService` ou helper compartilhado para entradas temporarias de conversao.
- Manter campos editaveis para simulacao, mas exibir claramente quando o valor veio da cotacao ativa.

Prioridade: media.

### 2. Market Analyzer ja usa Item Database, mas pode sugerir mais campos

Estado atual:
- Ao selecionar item, o Market usa `npcPrice` para preencher `Valor unitario NPC`.
- `Valor unitario Market`, quantidade, taxa e margem continuam manuais.

Melhoria sugerida:
- Quando o item existir no Stash, sugerir quantidade possuida.
- Quando o item tiver preco manual salvo em Stash ou Imbuement, sugerir como referencia de Market.
- Salvar ultimo preco de Market por item e servidor para reaproveitar depois.

Prioridade: alta, porque reduz redigitacao e conecta Market, Stash e Imbuements.

### 3. Stash e Market deveriam compartilhar precos manuais por item/servidor

Estado atual:
- Stash salva `unitGoldPrice` por item dentro do stash do perfil.
- Market Analyzer salva historico de analises.
- Imbuement Database salva precos de Market por material/servidor.

Risco:
- O mesmo item pode ter tres precos manuais diferentes em locais diferentes.

Melhoria sugerida:
- Criar `ItemPriceMemoryService` com chave por `serverId + itemId`.
- Fontes: `npc`, `market-manual`, `stash-manual`, `imbuement-market`, `last-analysis`.
- Stash, Market e Imbuement passariam a ler/escrever nessa memoria compartilhada.

Prioridade: muito alta.

### 4. Characters e Ferramenta Rapida ja compartilham XP, mas podem sincronizar melhor

Estado atual:
- Characters usa `CharacterProfileService` e tabela local de experiencia.
- Ferramenta Rapida preenche level/XP a partir do personagem ativo.
- Mudancas feitas na Ferramenta Rapida nao voltam para o personagem, o que esta correto para simulacao.

Melhoria sugerida:
- Adicionar botao "Usar personagem ativo" na Ferramenta Rapida para recarregar level/XP quando o usuario mudar o personagem.
- Opcionalmente permitir "Enviar para Characters" apenas quando o usuario quiser salvar.

Prioridade: baixa/media.

### 5. Premium Goals, Characters e Live Goal repetem partes do objetivo premium

Estado atual:
- Premium Goals e Characters usam `PremiumGoalsService`.
- Live Goal tem seu proprio objeto de meta, com item, moeda, total, current e bestiary slots.

Risco:
- O objetivo de Premium pode ficar diferente entre Premium Goals, Characters e Live Goal.

Melhoria sugerida:
- Criar `GoalBridgeService` para transformar um Premium Goal ativo em Live Goal.
- Botao futuro: "Mostrar este objetivo na live".
- Live Goal continuaria independente para stream, mas poderia nascer de um objetivo salvo.

Prioridade: alta para UX, media para arquitetura.

### 6. Live Goal ainda pede imagem/caminho manual

Estado atual:
- Campo "Imagem ou icone opcional" aceita path manual.
- Bestiary slots tambem aceitam imagem manual.

Melhoria sugerida:
- Se tipo for item, buscar via Item Database e preencher `imageUrl`.
- Se tipo for criatura, buscar via Monster Database e preencher `imageUrl`.
- Manter manual como override.

Prioridade: alta, porque evita erro de caminho e usa a biblioteca local.

### 7. Cotacao Central e perfis estao bem ligados, mas formulários poderiam reaproveitar catalogo

Estado atual:
- Cotacao tem catalogo de plataforma/mundo e tambem modo manual.
- Characters tambem tem plataforma/mundo do catalogo e mundo manual.

Melhoria sugerida:
- Criar um componente compartilhado `WorldServerSelector`.
- Usar em Cotacao, Characters e qualquer tela futura que precise escolher servidor/mundo.

Prioridade: media.

### 8. Hunt Analyzer ja alimenta Characters e Premium Goals, mas Stash ainda nao consome loot

Estado atual:
- Hunts salvas sao usadas para historico, comparativos, XP/h e estimativas.
- Loot da hunt nao vira entrada de Stash.

Melhoria sugerida:
- Botao futuro no Hunt Analyzer: "Adicionar loot ao Stash".
- Com revisao antes de salvar para evitar poluir o stash.
- Usar `enrichedLootItems` com `itemId`, `sellPrice` e `imagePath`.

Prioridade: alta, porque liga hunt real ao patrimonio.

## Proxima etapa recomendada

Criar `ItemPriceMemoryService`.

Por que:
- Resolve a maior repeticao real de dados.
- Ajuda Market Analyzer, Stash e Imbuement Database.
- Evita que o usuario cadastre o mesmo preco de item varias vezes.
- Mantem tudo por servidor/perfil, sem misturar RubinOT, Tibia Global e outros mundos.

Escopo sugerido:
1. Criar service sem alterar visual.
2. Migrar leitura/sugestao no Market Analyzer.
3. Migrar leitura/sugestao no Stash.
4. Migrar leitura/sugestao no Imbuement Database.
5. Depois adicionar indicadores discretos de fonte do preco.

