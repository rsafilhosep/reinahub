# Goals

Camada central para metas do ReinaHub.

Esta feature nao cria tela por enquanto. Ela existe para impedir que cada modulo calcule objetivos de um jeito diferente.

## Responsabilidades

- Calcular progresso percentual.
- Calcular quanto falta.
- Converter metas de moeda premium, GC e R$ usando `ReinaEconomyService`.
- Calcular XP faltante entre level atual e level alvo.
- Calcular quantas criaturas faltam para uma meta de bestiary/kill.
- Calcular quantos itens precisam ser vendidos para bater uma meta em gold.

## Arquivos

- `services/goal-service.ts`: regras centrais de metas.
- `types/goal.types.ts`: contratos reutilizaveis.

## Modulos que devem convergir para esta camada

- `quick-tools`: ja usa `GoalService` para objetivo rapido, XP e itens para gold.
- `premium-goals`: deve migrar gradualmente o calculo de premium para `GoalService`.
- `live-goal`: deve usar `GoalService` para dinheiro, kills e bestiary.
- `character-profile`: deve usar `GoalService` para objetivo de level e objetivos ativos.
- `hunt-analyzer`: pode usar a camada futuramente para estimar horas/sessoes ate uma meta.

## Regras

- Cotacao e perfil economico continuam vindo de `ReinaEconomyService`.
- Personagem ativo continua vindo de `ReinaActiveContextService` ou services de perfil.
- Esta camada nao deve renderizar UI.
- Storage especifico de cada modulo pode continuar separado ate migrarmos para metas salvas unificadas.

## Proximo passo recomendado

Migrar primeiro `PremiumGoalsService.calculate` para delegar o calculo financeiro ao `GoalService`, mantendo a API publica atual. Depois repetir o processo em `LiveGoalService.calculate`.
