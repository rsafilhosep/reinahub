# Verificacao e relatorios gerados

O ReinaHub separa dois tipos de rotina:

- `npm run verify:all`: checagem limpa para validar base, economia, arquitetura, assets, imbuements, equipamentos e build.
- `npm run reports:refresh`: atualizacao intencional dos relatorios JSON gerados.

## Quando usar `verify:all`

Use antes de finalizar uma etapa, antes de subir para GitHub/Vercel ou quando quiser saber se o projeto continua saudavel.

Esse comando roda os scanners em modo somente leitura usando `REINAHUB_VERIFY_READONLY=1`. Assim, ele valida os dados sem reescrever relatorios grandes e sem deixar o Git sujo apenas por causa de timestamps.

## Quando usar `reports:refresh`

Use quando voce realmente quiser atualizar os arquivos em `generated/`, por exemplo:

- depois de adicionar GIFs em `public/assets`;
- depois de revisar imagens importadas;
- depois de adicionar arquivos novos em `files_repository`;
- depois de revisar dados de equipment, imbuements ou Lua;
- antes de commitar uma mudanca de dados gerados.

## Comandos individuais

Os comandos individuais continuam escrevendo seus relatorios normalmente:

- `npm run assets:verify`
- `npm run assets:git-report`
- `npm run imbuements:verify`
- `npm run equipment:scan-repository`
- `npm run repository:scan-lua`

Isso permite atualizar uma area especifica sem rodar a rotina completa.

## Regra pratica

Para conferir se esta tudo bem:

```bash
npm run verify:all
```

Para atualizar relatorios de estudo/revisao:

```bash
npm run reports:refresh
```

Essa separacao reduz ruido no Git e deixa mais claro quando um arquivo gerado mudou por decisao nossa.
