# Equipment Database

Base local para equipamentos do ReinaHub.

## Objetivo

Guardar dados de armas, shields, armaduras, helmets, legs, boots e outros equipamentos para permitir:

- busca por nome, categoria, tipo de arma e level;
- comparação entre dois equipamentos;
- análise de ataque, defesa, armor, peso e slots de imbuement;
- ligação futura com Character Profile, Hunt Analyzer, Stash, Market Analyzer e Imbuement Database.

## Dados atuais

O arquivo principal é:

`source/web/src/features/equipment-database/data/equipment.json`

Ele contém uma base inicial revisável. Cada item pode ser enriquecido automaticamente com:

- `itemId` e `clientId` via `ReinaDataService`;
- preço NPC quando existir;
- imagem local via Asset Resolver;
- link para Item Database.

## Scanner seguro de fontes

Comando:

`npm run equipment:scan-repository`

Ele procura arquivos em:

`files_repository/`

Extensões lidas:

- `.html`
- `.htm`
- `.pdf`
- `.csv`
- `.tsv`
- `.json`
- `.txt`

O scanner apenas lê texto e gera candidatos. Ele não executa arquivos, não move fontes brutas e não altera `equipment.json`.

Para PDFs impressos pelo navegador, o scanner tenta usar Python com `pdfplumber`. Se o Python padrão da máquina não tiver essa biblioteca, informe o caminho manualmente:

PowerShell:

`$env:REINAHUB_PYTHON="C:\caminho\para\python.exe"; $env:REINAHUB_PYTHONPATH="C:\caminho\para\site-packages"; npm run equipment:scan-repository`

No Codex Desktop, o runtime bundled já possui `pdfplumber` e pode ser usado para extrair as tabelas salvas em PDF.

Relatórios gerados:

- `source/web/src/features/equipment-database/generated/equipment-scan-report.json`
- `source/web/src/features/equipment-database/generated/equipment-source-files-report.json`
- `source/web/src/features/equipment-database/generated/equipment-import-candidates.json`
- `source/web/src/features/equipment-database/generated/equipment-ready-candidates.json`
- `source/web/src/features/equipment-database/generated/equipment-review-needed.json`

Os candidatos marcados como `ready` ainda precisam de revisão antes de serem promovidos para a base oficial.

## Promoção revisada

Comando:

`npm run equipment:promote-reviewed`

Esse comando usa `equipment-ready-candidates.json` como entrada e promove apenas candidatos marcados como `ready`, sem duplicar `id` ou nome já existente em `equipment.json`.

Antes de alterar a base real, ele cria um backup em:

`source/web/src/features/equipment-database/generated/backups/`

Relatórios gerados:

- `source/web/src/features/equipment-database/generated/equipment-promotion-report.json`
- `source/web/src/features/equipment-database/generated/equipment-promoted-items.json`

Fluxo recomendado:

1. salvar fontes brutas em `files_repository`;
2. rodar `npm run equipment:scan-repository`;
3. revisar `equipment-ready-candidates.json` e `equipment-review-needed.json`;
4. rodar `npm run equipment:promote-reviewed`;
5. rodar novamente `npm run equipment:scan-repository` para atualizar os relatórios.

## Revisão manual dos pendentes

Comandos:

`npm run equipment:prepare-review`

`npm run equipment:apply-review`

O primeiro comando transforma `equipment-review-needed.json` em uma fila mais curta:

- `source/web/src/features/equipment-database/generated/equipment-manual-review-queue.json`

Ele também cria ou atualiza o arquivo editável:

- `source/web/src/features/equipment-database/data/equipment-manual-review.json`

Use `status: "approved"` apenas quando os dados estiverem revisados. Use `status: "ignored"` para manter algo fora da base. O comando `equipment:apply-review` só promove entradas aprovadas, cria backup antes de alterar `equipment.json` e gera:

- `source/web/src/features/equipment-database/generated/equipment-apply-review-report.json`

## Fonte externa

A primeira referência pensada é o TibiaWiki, por exemplo:

`https://www.tibiawiki.com.br/wiki/Espadas`

O ReinaHub não deve depender da página ao vivo durante o uso. O fluxo correto é:

1. ler ou salvar a fonte como material bruto;
2. normalizar para `equipment.json`;
3. revisar diferenças;
4. usar apenas o JSON local dentro do app.

Algumas páginas podem bloquear leitura automática por proteção do site. Nesse caso, salve snapshots HTML/CSV em `files_repository` e trate como fonte de estudo, nunca como código executável.

## API

`/api/equipment`

Parâmetros:

- `query`
- `category`
- `weaponType`
- `level`
- `id`
- `left` e `right` para comparação

## Página

`/equipment`

Permite pesquisar equipamentos, abrir detalhes e comparar A vs B.

## Futuro

Campos preparados para:

- market;
- histórico de preço;
- sinergia de set;
- recomendações por vocação;
- perfis de hunt;
- upgrade path;
- forge;
- snapshot da fonte/wiki.
