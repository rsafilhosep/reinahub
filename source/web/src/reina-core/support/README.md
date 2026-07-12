# Support Slots

O ReinaHub possui uma fundacao para apoios futuros, separada das funcionalidades principais.

## Objetivo

Preparar espacos para:

- anuncios;
- doacao voluntaria;
- parcerias com OTServers, criadores de conteudo ou outros projetos;
- creditos discretos em exportacoes.

## Estado atual

- Tudo fica desligado por padrao.
- Nenhum script externo e carregado.
- Nenhum nome de parceiro, revendedor ou servidor e exibido automaticamente.
- Os slots existem apenas como pontos controlados de renderizacao futura.

## Flags futuras

```env
NEXT_PUBLIC_REINAHUB_SUPPORT_ENABLED=true
NEXT_PUBLIC_REINAHUB_ADS_ENABLED=true
NEXT_PUBLIC_REINAHUB_DONATIONS_ENABLED=true
NEXT_PUBLIC_REINAHUB_PARTNERS_ENABLED=true
```

Mesmo com flags ativas, qualquer integracao real deve passar por revisao de layout, privacidade, performance e neutralidade.

## Posicoes preparadas

- `home-support`: apoio/parceria na Home.
- `tool-footer-support`: apoio discreto no fim de ferramentas longas.
- `export-support`: credito opcional em PNG/PDF.
- `sidebar-support`: doacao voluntaria ou apoio lateral.

## Regras

- Nao colocar apoio dentro de cards de calculo.
- Nao interromper formularios, exportacoes ou resultados.
- Nao transformar revendedor em recomendacao oficial.
- Nao exibir scripts de terceiros sem uma camada de consentimento e revisao.
- Deixar claro quando algo for parceria, anuncio ou doacao.
