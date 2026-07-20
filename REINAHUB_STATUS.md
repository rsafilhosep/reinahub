# ReinaHub Status

Fotografia curta do estado atual do projeto.

## Estado geral

O ReinaHub esta em fase de consolidacao e expansao controlada.

Ja existe uma fundacao funcional para:

- economia por servidor/mundo;
- personagem ativo;
- banco local de itens, monstros, NPCs e loot;
- assets locais;
- Stash;
- Hunt Analyzer;
- Premium Goals;
- Live Goal;
- Imbuement Database;
- Equipment Database;
- navegacao organizada;
- verificadores de arquitetura, dados, assets e build.

## Pronto para uso

- Cotacao Central como fonte economica ativa.
- Calculadora RC/TC/GC/R$.
- Market Analyzer com busca de Item Database.
- Hunt Analyzer com importacao por arquivo/texto, historico e export PNG/PDF.
- Stash manual com valores por cotacao ativa.
- Character Profile com XP, objetivo de level e vinculo com contexto ativo.
- Premium Goals.
- Live Goal e Overlay.
- Monster Database.
- Item Database.
- NPC Hub inicial.
- Imbuement Database com simulacao economica.
- Equipment Database com filtros e comparador.
- Assets Resolver e pipeline de importacao/verificacao.

## Parcial

- Biblioteca visual: muitos assets ja entraram, mas ainda faltam muitas imagens.
- Taxonomia: boa base automatica, mas ainda precisa revisao manual.
- Equipment Database: funcional, mas ainda depende de revisao de fontes e dados completos.
- NPC Hub: bom ponto de partida, ainda precisa enriquecer locais, viagens, servicos e relacoes.
- Character Lookup em OTServers: pode falhar por bloqueio externo; fallback manual continua importante.
- Imbuements: base pratica existe, mas precos de Market e materiais ainda podem ficar mais inteligentes.
- Quick Tools: existe, mas pode virar uma central mais forte de objetivo rapido.

## Pendencias conhecidas

- Cobertura de assets ainda baixa em relacao ao total da base.
- Muitos arquivos de asset alterados no Git; precisa revisao por lote.
- Relatorios gerados podem ficar grandes.
- Algumas fontes externas precisam de provenance/licenca mais clara.
- Ainda ha risco de UI densa em telas com muita informacao.
- Smoke tests automatizados de fluxo ainda nao existem.

## Guardrails atuais

Comandos principais:

```bash
npm run verify:all
npm run architecture:verify
npm run assets:git-report
npm run assets:verify
npm run build
```

Documentos importantes:

- `RELEASE_CHECKLIST.md`
- `ASSET_POLICY.md`
- `DATA_SOURCE_POLICY.md`
- `REINAHUB_ARCHITECTURE.md`
- `REINAHUB_DATA_FLOW.md`
- `REINAHUB_PROGRESS.md`

## Proxima recomendacao tecnica

Criar uma Central de Objetivos Rapidos mais clara, reaproveitando o que ja existe:

- XP ate level alvo;
- criaturas necessarias por XP;
- gold ate objetivo;
- item vendido ate objetivo;
- moeda premium ate objetivo;
- troca rapida de servidor ativo.

Motivo: essa funcionalidade conecta Character, Economy, Items, Monsters, Stash, Premium Goals e Live Goal. Ela reforca a identidade do ReinaHub como ferramenta de decisao, nao apenas wiki.

## Proxima recomendacao de biblioteca

Trabalhar assets e dados por lotes pequenos:

- primeiro moedas, potions, supplies e creature products comuns;
- depois monstros de hunts frequentes;
- depois equipamentos por categoria;
- depois NPCs/bosses/outfits/mounts.

Sempre rodar:

```bash
npm run assets:import-inbox
npm run assets:verify
npm run assets:git-report
```

## Direcao do produto

O ReinaHub deve evitar virar apenas uma wiki.

O diferencial deve ser responder perguntas de jogador:

- Quanto falta?
- O que vender?
- O que matar?
- Qual equipamento compensa?
- Qual hunt esta melhorando?
- Qual servidor/perfil esta mais vantajoso?
- Como mostrar isso em live?
