# ReinaHub Asset Policy

Esta politica existe para proteger o ReinaHub de commits gigantes, assets brutos misturados com assets publicados e dependencias acidentais de fontes externas.

## Principios

- `files_repository` e material bruto de estudo. Nao entra no app, nao e executado e nao deve ser commitado.
- `public/assets` e biblioteca publicada pelo Next.js. Tudo ali pode ser servido para o usuario.
- Assets entram no app por script, revisao ou copia consciente. Evite montar caminhos manualmente em componentes.
- A fonte de verdade para caminhos e o Asset Resolver.
- Relatorios gerados ajudam a revisar, mas nem todo relatorio precisa ser commitado.

## Pastas

| Pasta | Uso | Commit |
| --- | --- | --- |
| `files_repository/` | Downloads, dumps, PDFs, HTMLs, GIFs brutos, OTServers e material de estudo | Nao |
| `files_repository/assets_inbox/` | Entrada segura para imagens brutas | Nao |
| `public/assets/items/` | Imagens finais de itens usadas pelo app | Sim, com revisao |
| `public/assets/monsters/` | Imagens finais de monstros usadas pelo app | Sim, com revisao |
| `public/assets/npcs/` | Imagens finais de NPCs usadas pelo app | Sim, com revisao |
| `public/assets/bosses/` | Imagens finais de bosses usadas pelo app | Sim, com revisao |
| `public/assets/icons/` | Placeholders e icones internos | Sim |
| `source/web/src/reina-core/assets/generated/` | Relatorios de auditoria e prioridade | Parcial |

## Quando commitar assets

Commite assets quando:

- foram importados para `public/assets`;
- aparecem corretamente no app;
- nao sao arquivos brutos de fonte externa;
- o volume do commit ainda e revisavel;
- `npm run assets:verify` e `npm run build` passam.

Evite commitar quando:

- o lote tem milhares de imagens sem revisao;
- o Git fica pesado demais para revisar;
- os arquivos ainda estao em `files_repository`;
- o arquivo e relatorio diagnostico grande que pode ser regenerado.

## Relatorios gerados

Normalmente vale commitar:

- `assets-report.json`, quando usado para acompanhar cobertura;
- `top-50-assets.json`, `top-100-assets.json`, `top-50-monster-assets.json`, `top-100-monster-assets.json`, quando servem para priorizacao;
- `sample-assets-needed.json`, por ser pequeno e util.

Revisar antes de commitar:

- `missing-assets.json`;
- `imported-assets.json`;
- `unmatched-inbox-assets.json`;
- `unmatched-assets-review.json`;
- `asset-git-report.json`.

Esses arquivos podem ficar grandes. Se forem apenas diagnostico local, podem ser regenerados.

## Checklist antes de subir para GitHub/Vercel

Rode:

```bash
npm run assets:git-report
npm run assets:verify
npm run architecture:verify
npm run build
```

Depois revise:

- `source/web/src/reina-core/assets/generated/asset-git-report.json`
- total de arquivos novos em `public/assets`
- tamanho total dos assets alterados
- se existem relatorios gerados muito grandes

## Limites recomendados

Para commits normais:

- ate 200 imagens revisadas por commit e confortavel;
- acima de 500 imagens, prefira dividir em lotes;
- acima de 25 MB de assets alterados, revise se precisa Git LFS, CDN ou outro armazenamento.

Esses limites nao sao regras duras, mas evitam que o projeto fique pesado antes da hora.

## Futuro

Se a biblioteca de assets crescer muito, considerar:

- Git LFS para GIFs/PNGs;
- bucket/CDN para assets grandes;
- manifest versionado por pacote;
- packs por categoria, como `items-basic`, `monsters-free-area`, `equipment-core`;
- auditoria de licenca/proveniencia por fonte.
