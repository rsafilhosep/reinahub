# ReinaHub Data Source Policy

O ReinaHub pode usar sites, arquivos, XMLs, Lua, imagens e pacotes externos como fontes de referencia, mas o app nao deve depender deles em tempo real.

## Principios

- O ReinaHub nao e uma copia de Wiki ou de outro site.
- Fontes externas sao materia-prima para gerar dados proprios, normalizados e validados.
- Nenhum dado externo entra automaticamente no `ReinaDataService`.
- Nenhuma imagem externa deve ser usada diretamente em runtime quando puder ser salva como asset local revisado.
- Toda importacao deve manter origem, data, URL ou caminho local e nivel de confianca.
- Conflitos entre fontes devem gerar relatorio, nao sobrescrever dados silenciosamente.
- Arquivos de `files_repository` sao apenas leitura e nunca devem ser executados.

## Fluxo recomendado

```text
Fonte externa ou pacote bruto
  -> captura bruta controlada
  -> normalizacao
  -> validacao
  -> relatorio de conflitos e pendencias
  -> dados gerados locais
  -> consumo pelo ReinaHub
```

## Tipos de fonte

- `external-site`: paginas publicas usadas como referencia.
- `local-package`: pacotes em `files_repository`.
- `manual`: dados revisados ou preenchidos manualmente.
- `official-export`: arquivos oficiais ou exportacoes estruturadas, quando existirem.

## Regras para sites externos

- Respeitar termos, robots e disponibilidade do site.
- Preferir APIs ou arquivos estruturados quando existirem.
- Evitar scraping agressivo.
- Nao baixar tudo automaticamente sem lista de prioridade.
- Salvar snapshots e relatorios para que o app continue funcionando offline.

## Regras para assets

- GIFs, PNGs e imagens devem ser salvos localmente em `public/assets`.
- O app deve consumir imagens via asset resolver.
- Cada asset importado deve ter metadados de origem.
- Downloads em massa devem ser evitados no inicio; usar amostras e prioridades.

## Proveniencia minima

Cada dado importado deve conseguir responder:

- de onde veio;
- quando foi importado;
- qual script importou;
- qual entidade foi afetada;
- se houve conflito;
- se foi revisado manualmente.

## O que nao fazer

- Nao chamar sites externos diretamente no render das paginas.
- Nao copiar visual, layout ou experiencia de outro produto.
- Nao sobrescrever dados locais confiaveis sem relatorio.
- Nao executar scripts brutos.
- Nao misturar dados brutos com dados finais.
