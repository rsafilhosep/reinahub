# ReinaHub Release Checklist

Use este checklist antes de subir alteracoes para GitHub, Vercel ou qualquer pacote de teste.

## 1. Saude do projeto

Rode:

```bash
npm run verify:all
```

O comando precisa passar completo. Ele cobre:

- database;
- economia;
- data sources;
- arquitetura;
- assets;
- auditoria de assets no Git;
- imbuements;
- equipment scan;
- build.

## 2. Assets

Revise:

```text
source/web/src/reina-core/assets/generated/asset-git-report.json
```

Conferir:

- quantidade de assets novos em `public/assets`;
- peso total dos assets alterados;
- relatorios gerados muito grandes;
- se o lote esta revisavel.

Regra pratica:

- ate 200 imagens revisadas: ok para commit normal;
- acima de 500 imagens: dividir em lotes;
- acima de 25 MB: avaliar Git LFS, CDN ou pacote externo.

Nunca subir:

- `files_repository`;
- dumps brutos;
- arquivos `.lua`, `.spr`, `.dat`, `.otb` ou pacotes de servidor;
- PDFs/HTMLs usados apenas como fonte de estudo.

## 3. Dados gerados

Conferir se os JSONs alterados sao runtime ou diagnostico.

Normalmente entram no Git:

- dados usados pelo app;
- catalogs revisados;
- pequenos relatorios de prioridade.

Revisar antes:

- `missing-assets.json`;
- `imported-assets.json`;
- `unmatched-inbox-assets.json`;
- `unmatched-assets-review.json`;
- `asset-git-report.json`.

## 4. Teste manual rapido

Abrir localmente:

```bash
npm run dev
```

Testar:

- `/`
- `/cotacao`
- `/calculadora-rc`
- `/hunt`
- `/stash`
- `/characters`
- `/premium-goals`
- `/live-goal`
- `/monsters`
- `/items`
- `/npcs`
- `/imbuements`
- `/equipment`

Fluxos importantes:

- trocar servidor ativo;
- usar conversor rapido;
- importar hunt por texto ou arquivo;
- editar item no Stash;
- buscar item/monstro;
- abrir overlay de live;
- consultar Equipment Database com personagem ativo.

## 5. Git

Antes de commit:

```bash
git status --short
```

Conferir:

- nenhum arquivo bruto em `files_repository`;
- nenhum `.zip` novo;
- nenhuma pasta `.next`, `node_modules` ou `tmp`;
- assets em lote estao intencionais;
- docs refletem o que mudou.

## 6. Vercel

Antes de deploy:

- `npm run verify:all` passou;
- build local passou;
- assets novos sao necessarios para a versao;
- nao ha dependencia runtime de fonte externa nao controlada;
- disclaimer e politicas continuam acessiveis.

## 7. Depois do deploy

Conferir no site:

- home carrega;
- menu lateral funciona;
- cotacao ativa aparece;
- imagens principais aparecem;
- Hunt Analyzer gera PNG/PDF;
- overlay abre em link separado;
- rotas dinamicas `/items`, `/monsters`, `/equipment`, `/imbuements` respondem.
