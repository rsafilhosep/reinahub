# Premium Goals

Modulo para transformar produtos comprados com moeda premium em objetivos calculaveis.

## Ideia

O catalogo possui produtos com custo padrao em moeda premium. O nome da moeda vem da Cotacao Central do servidor ativo.

Exemplo:

- catalogo: `Premium / VIP 30 dias`, custo padrao `250`
- servidor ativo: moeda `RC`
- resultado: `250 RC`

Se o servidor tiver preco diferente, o usuario pode salvar um override por servidor.

## Estado atual

- catalogo inicial placeholder
- override por servidor salvo no `StorageService`
- calculo de quanto falta em moeda premium
- conversao para gold
- conversao para reais pela Cotacao Central
- progresso salvo por contexto ativo
- estimativa por Hunt History do contexto ativo:
  - media por hunt
  - media por hora
  - horas ate a meta
  - hunts estimadas
  - dias estimados jogando 3h/dia

## Futuro

- receber lista real catalogada
- marcar itens temporarios/eventos
- integrar Item/Market para estimar quantos itens precisam ser vendidos
