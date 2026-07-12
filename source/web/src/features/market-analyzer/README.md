# Market Analyzer

Feature responsavel por comparar venda para NPC com venda no Market.

## Servicos

### `services/market-economy-service.ts`

Servico client-side que centraliza:

- calculo de NPC total
- calculo de Market bruto
- taxa de Market
- Market liquido
- diferenca absoluta e percentual
- melhor opcao considerando vantagem minima para Market
- conversao para moeda premium e reais pela Cotacao Central
- historico local de analises

## Regra de recomendacao

NPC e a opcao padrao quando o ganho do Market e empate, negativo ou pequeno.

Market so e recomendado quando o valor liquido, ja descontada a taxa, supera:

- a vantagem minima percentual configurada;
- e o ganho minimo em gp, quando informado.

Isso evita recomendar Market por diferencas pequenas que nao compensam espera, risco de ordem e variacao de preco.

## Regra arquitetural

A pagina `/market` deve renderizar e coletar inputs. Regras economicas e historico ficam no `MarketEconomyService`.

Busca de item deve continuar vindo de `/api/items`, que usa o Item Database e a base local.
