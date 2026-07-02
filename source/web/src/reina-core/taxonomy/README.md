# ReinaHub Taxonomy

Esta camada define a organizacao interna do ReinaHub para monstros, itens, equipamentos e armas.

Ela nao substitui os JSONs canonicos da base local. Ela cria uma camada revisavel de classificacao para que futuras importacoes de TibiaVault, TibiaWiki, Fandom, OTServer e fontes manuais entrem no mesmo padrao.

## Arquivos base

- `creature-classes.json`: classes de bestiary/monstros.
- `item-categories.json`: categorias gerais de itens.
- `equipment-slots.json`: slots de equipamentos.
- `weapon-types.json`: tipos de armas.
- `manual-classifications.json`: correcoes manuais por itemId, nome de item ou nome de monstro normalizado.

## Gerar classificacao

Rode:

```bash
npm run taxonomy:classify
```

Isso gera:

- `generated/classified-items.json`
- `generated/classified-monsters.json`
- `generated/unclassified-items.json`
- `generated/unclassified-monsters.json`
- `generated/taxonomy-report.json`

## Confianca

Cada classificacao possui `confidence`:

- `high`: classificacao manual ou regra muito especifica.
- `medium`: regra automatica razoavel.
- `low`: sugestao fraca que precisa de revisao.
- `unclassified`: pendente.

Dados `medium` e `low` devem ser revisados antes de virarem dados canonicos.

## Relacao com fontes externas

Sites externos devem ser usados como fontes de enriquecimento, nao como dependencia em tempo real.

Fluxo recomendado:

1. Detectar dados faltantes no ReinaHub.
2. Consultar fonte externa de forma controlada.
3. Salvar dado local com origem/provenance.
4. Classificar usando esta taxonomia.
5. Revisar pendencias em `unclassified-*`.

Assim, se uma fonte externa mudar ou sair do ar, o ReinaHub continua com seu banco local organizado.
