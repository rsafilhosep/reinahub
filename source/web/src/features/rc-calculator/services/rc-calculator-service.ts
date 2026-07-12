export type RcCalculatorInput = {
  lote: number;
  precoPacote: number;
  quantidade: number;
  cotacao: number;
  goldDisponivel: number;
  goldMochila: number;
  goldBanco: number;
};

export type RcCalculatorResult = {
  lote: number;
  normalizedQuantidade: number;
  precoMoeda: number;
  precoGc: number;
  totalGold: number;
  valorTotal: number;
  moedasPossiveisExatas: number;
  rcPossiveis: number;
  valorPossivel: number;
  preco1Gc: number;
  preco100Gc: number;
  preco1K: number;
  preco10K: number;
  preco100K: number;
  precoKk: number;
  preco100Kk: number;
  patrimonio: number;
};

export class RcCalculatorService {
  static calculate(input: RcCalculatorInput): RcCalculatorResult {
    const lote = Math.max(1, Number(input.lote) || 25);
    const precoPacote = Number(input.precoPacote) || 0;
    const quantidade = Number(input.quantidade) || 0;
    const cotacao = Number(input.cotacao) || 0;
    const goldDisponivel = Number(input.goldDisponivel) || 0;
    const goldMochila = Number(input.goldMochila) || 0;
    const goldBanco = Number(input.goldBanco) || 0;

    const normalizedQuantidade = Math.max(lote, Math.floor(quantidade / lote) * lote);
    const precoMoeda = lote > 0 ? precoPacote / lote : 0;
    const precoGc = cotacao > 0 ? precoMoeda / cotacao : 0;
    const moedasPossiveisExatas = cotacao > 0 ? goldDisponivel / cotacao : 0;
    const rcPossiveis = cotacao > 0 ? Math.floor(moedasPossiveisExatas / lote) * lote : 0;

    return {
      lote,
      normalizedQuantidade,
      precoMoeda,
      precoGc,
      totalGold: normalizedQuantidade * cotacao,
      valorTotal: normalizedQuantidade * precoMoeda,
      moedasPossiveisExatas,
      rcPossiveis,
      valorPossivel: rcPossiveis * precoMoeda,
      preco1Gc: precoGc,
      preco100Gc: precoGc * 100,
      preco1K: precoGc * 1000,
      preco10K: precoGc * 10000,
      preco100K: precoGc * 100000,
      precoKk: precoGc * 1000000,
      preco100Kk: precoGc * 100000000,
      patrimonio: (goldMochila + goldBanco) * precoGc
    };
  }

  static parseGoldInput(value: string) {
    return Number(value || 0);
  }

  static sanitizeGoldInput(value: string) {
    return value.replace(/[^\d]/g, "");
  }

  static buildCurrencyQuickAmounts(lote: number) {
    const safeLote = Math.max(1, Number(lote) || 25);
    return [1, 2, 3, 4, 10, 20, 40].map((multiplier) => multiplier * safeLote);
  }
}
