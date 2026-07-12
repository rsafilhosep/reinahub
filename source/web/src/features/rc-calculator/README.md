# RC Calculator

A Calculadora RC usa a Cotacao Central como fonte de verdade para:

- servidor ativo;
- nome da moeda premium;
- lote base;
- gold por moeda premium;
- preco do lote.

Os calculos ficam em `RcCalculatorService`, evitando duplicacao de formulas dentro da pagina.

## Help

A tela usa o Help System global:

- `HelpToggle` liga/desliga as dicas;
- `HelpTip` mostra ajuda contextual discreta;
- a preferencia fica salva pelo `StorageService`.

O objetivo e explicar campos ambiguos sem alterar a identidade visual do ReinaHub.
