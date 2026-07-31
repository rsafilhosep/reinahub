# External Quotes

Esta camada prepara o ReinaHub para consultar cotacoes externas de moedas premium sem misturar leitura automatica com dados confiaveis do usuario.

## Como funciona

- As fontes cadastradas ficam em `external-quote-source-registry.ts`.
- O `ExternalQuoteSourceService` roda apenas no server-side e le as paginas como texto.
- O scanner nao executa scripts, nao roda JavaScript remoto e nao aplica valores automaticamente.
- A rota `/api/external-quotes` retorna candidatos de cotacao para revisao.

## Compra e venda

- `playerSellLotPrice`: jogador vende moedas para um vendedor e recebe reais.
- `playerBuyLotPrice`: jogador compra moedas de um vendedor e paga reais.

## Uso esperado

A Cotacao Central pode chamar a API, revisar o resultado e preencher uma fonte manual. O usuario ainda confirma antes de salvar ou aplicar no servidor ativo.

## Futuro

Cada fonte podera ganhar um parser especifico, com campos mais confiaveis, historico, auditoria e data da ultima verificacao.
