# Character Profile

Camada de personagens do ReinaHub.

## Responsabilidades

- Guardar personagens locais por perfil/servidor.
- Definir o personagem ativo.
- Vincular personagem ao perfil economico ativo.
- Ler texto colado ou retornos de consulta externa quando disponivel.
- Calcular progresso de level e XP por uma camada reutilizavel.

## Servicos

- `CharacterProfileService`: CRUD local, personagem ativo, parse de ficha e vinculo com servidor.
- `CharacterProgressService`: tabela de experiencia, XP faltante, progresso ate o proximo level, progresso ate o level alvo, plano por XP/h e kills necessarias por monstro.

## Integracoes

- `Quick Tools` usa `CharacterProgressService` para preencher level atual, XP atual e meta.
- `Goals` fornece calculos genericos de progresso usados pelo `CharacterProgressService`.
- `Hunt Analyzer` pode futuramente usar `CharacterProgressService` para estimar quantas hunts faltam ate uma meta.
- `Premium Goals` e `Live Goal` podem usar o personagem ativo como contexto das metas.

## Regra

A UI nao deve recalcular XP/level manualmente. Quando precisar de progresso de personagem, use `CharacterProgressService`.
