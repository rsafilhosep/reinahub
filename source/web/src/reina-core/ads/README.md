# Ads

O ReinaHub possui uma fundacao para espacos de anuncio futuros, mas anuncios ficam desligados por padrao.

## Regra atual

- Nenhum script externo e carregado.
- Nenhuma propaganda real e exibida.
- `AdSlot` retorna `null` enquanto `NEXT_PUBLIC_REINAHUB_ADS_ENABLED` nao for `true`.
- Posicoes permitidas ficam registradas em `ad-slots.ts`.

## Como ativar futuramente

Definir:

```env
NEXT_PUBLIC_REINAHUB_ADS_ENABLED=true
```

Mesmo ativado, o componente exibe apenas um placeholder interno. Qualquer integracao real deve passar por revisao de performance, privacidade e layout.

## Posicoes iniciais

- `home-after-stats`
- `home-after-tools`
- `home-footer`
- `tool-footer`

## Regras de uso

- Nao colocar anuncios dentro de cards de calculo.
- Nao interromper formulario, resultado ou exportacao.
- Preferir areas entre secoes ou fim da pagina.
- Manter anuncios desligados durante desenvolvimento de funcionalidades centrais.
