# REINAHUB_ARCHITECTURE

Documento de revisao arquitetural do ReinaHub em 2026-07-01.

Esta revisao considera o estado atual do projeto e nao propoe mudancas implementadas agora. O objetivo e consolidar a direcao tecnica antes de continuar adicionando modulos.

## 1. Estado atual da arquitetura

O ReinaHub esta organizado como uma aplicacao Next.js/React com App Router.

Estrutura principal:

- `app/`: rotas, paginas e APIs server-side.
- `components/`: componentes globais compartilhados, como shell, navegacao, paineis, abas, banners e avatares.
- `services/`: servicos historicos/client-side e servicos de ferramentas ja migradas, como cotacao, storage, sprites, formatacao e hunt.
- `source/web/src/reina-core/`: nucleo local de dados e assets.
- `source/web/src/features/`: novas funcionalidades estruturadas por dominio.
- `public/assets/`: assets que o app pode servir diretamente pelo Next.js.
- `files_repository/`: biblioteca bruta de referencia, fora do fluxo direto da aplicacao.
- `scripts/`: automacoes gerais, especialmente sincronizacao de assets legados.

Rotas atuais:

- `/cotacao`: Cotacao Central e servidor ativo.
- `/calculadora-rc`: Calculadora RC/Tibia Coin.
- `/market`: Market Analyzer.
- `/hunt`: Hunt Analyzer.
- `/assets`: Assets Manager.
- `/monsters`: Monster Database.
- `/items`: Item Database.
- `/api/hunt/summary`: processamento server-side de hunt.
- `/api/monsters`: busca e detalhe de monstros.
- `/api/items`: busca e detalhe de itens.

O nucleo de dados fica em `source/web/src/reina-core/database`:

- `ReinaDataService` e a fonte central para itens, monstros, loot e precos NPC.
- Os dados finais ficam em `generated/*.json`.
- Importadores ficam em `importers/*.mjs`.
- Validacao e verificacao ficam em `scripts/`.
- Normalizacao de nomes fica em `normalize.ts`.
- Correcoes manuais ficam em `manual-mappings.json`.

O nucleo de assets fica em `source/web/src/reina-core/assets`:

- `asset-resolver.ts` gera caminhos previsiveis para itens, monstros, NPCs e bosses.
- Scripts verificam assets, importam inbox e geram prioridade de coleta.
- Relatorios ficam em `generated/*.json`.
- Assets usados pelo app ficam em `public/assets`.

As novas features seguem um padrao modular:

- `components/`
- `hooks/`
- `services/`
- `types/`
- `utils/`

Hoje esse padrao esta aplicado em:

- `source/web/src/features/monster-database`
- `source/web/src/features/item-database`

## 2. Pontos fortes

O projeto ja tem uma separacao saudavel entre dados brutos, dados gerados e dados consumidos pela aplicacao.

Pontos fortes principais:

- `files_repository` esta conceitualmente separado como material bruto de estudo.
- `ReinaDataService` centraliza a base local e evita que cada modulo leia JSON por conta propria.
- `ReinaDataService` usa `server-only`, protegendo o client contra bundles grandes.
- As APIs `/api/items`, `/api/monsters` e `/api/hunt/summary` mantem os JSONs pesados no servidor.
- A Cotacao Central ja funciona como fonte para servidor ativo e conversoes economicas.
- `StorageService` centraliza acesso ao `localStorage`.
- A camada de normalizacao ja existe e evita varios problemas de nomes, acentos, apostrofos e aliases.
- O pipeline de importacao/validacao de dados ja produz relatorios e arquivos gerados reaproveitaveis.
- O sistema de assets ja tem resolver, scanner, relatorios, prioridade e inbox segura.
- Item Database e Monster Database ja nasceram como features reutilizaveis, nao como paginas soltas.
- Os servicos de Item e Monster ja foram pensados para uso futuro por Hunt, Loot, Bestiary, Charms e Profit.
- As rotas de Item e Monster tem navegacao cruzada simples e util.
- A interface mantem identidade visual consistente por meio de `AppShell`, `HubNav`, `Panel` e estilos globais.
- O build atual valida TypeScript, rotas e APIs.

## 3. Pontos que podem gerar problemas futuramente

### Duplicacao entre Item Database e Monster Database

As duas features possuem estruturas muito parecidas:

- hooks de busca quase iguais;
- componentes de search parecidos;
- componentes de details parecidos;
- verificacao de asset existente duplicada;
- padrao de API repetido;
- blocos `future` parecidos.

Isso ainda nao e um problema grave, mas tende a crescer quando vierem Boss Database, NPC Database, Spell Database, Quest Database e Bestiary.

### Dois sistemas de assets coexistindo

Existem duas linhas de assets:

- sistema antigo em `services/image-resolver.ts`, `source/assets` e `public/images`;
- sistema novo em `source/web/src/reina-core/assets` e `public/assets`.

Enquanto ambos existirem, ha risco de:

- componentes usando resolvers diferentes;
- placeholders diferentes;
- nomes normalizados com regras diferentes;
- bugs sutis ao importar ou exibir sprites.

### Normalizacao espalhada

Hoje `itemLookupKey` e `normalizeItemName` sao a base mais confiavel, mas existem outros pontos fazendo normalizacao propria, especialmente no sistema antigo de imagens.

Risco futuro:

- um item ser encontrado no banco mas nao no asset;
- um monstro abrir por link, mas nao casar com imagem;
- aliases manuais resolverem validacao, mas nao resolverem busca visual.

### APIs com formato repetido

`/api/items` e `/api/monsters` seguem praticamente o mesmo desenho:

- query string;
- detalhe por identificador;
- resposta JSON;
- erro 404 simples.

Isso e bom por consistencia, mas no futuro pode virar repeticao se cada entidade criar sua propria API manualmente.

### Performance do `getDroppedBy`

O `ItemDatabaseService.getDroppedBy(itemId)` cruza o item contra `monsterLoot` filtrando a lista. Para a base atual ainda e aceitavel, mas com mais dados, assets e enriquecimento, pode ficar caro.

Uma estrutura indexada como `lootByItemId` ou `monsterDropsByItemId` seria melhor quando o Item Database virar base de calculos e busca global.

### Uso misto de `services/` raiz e `source/web/src/features`

O projeto tem uma fase inicial em `services/` e uma fase mais modular em `source/web/src/features`.

Isso e normal em migracao, mas pode gerar duvidas:

- servicos novos devem ir na raiz ou em feature?
- Hunt Analyzer deveria virar feature?
- quote-service e storage-service sao core ou service global?

### Navegacao ainda manual

`HubNav` hoje lista modulos manualmente. Isso e simples e bom agora, mas com mais areas pode ficar dificil manter:

- rotas;
- labels;
- status "em breve";
- grupos como Database, Ferramentas, Economia e Studio;
- permissoes futuras;
- ordem da navegacao.

### Componentes compartilhados ainda pequenos

`Panel`, `AppShell`, `Tabs` e `HubNav` ajudam bastante, mas ainda nao existe uma camada de componentes de entidade:

- `EntitySearch`;
- `EntityDetailsHeader`;
- `MetricGrid`;
- `AssetImage`;
- `LinkedEntityRow`;
- `EmptyState`;
- `LoadingState`;
- `ErrorMessage`.

Sem isso, as proximas features podem copiar bastante codigo.

### Acoplamento visual por classes globais

As paginas usam classes globais como `history-item`, `hero-grid`, `hero-card`, `value`, `label`. Isso ajuda a manter identidade visual, mas tambem cria dependencia implicita.

Se o projeto crescer muito, pode ser util criar componentes que encapsulem essas classes para evitar divergencia.

### Testes ainda leves

O projeto tem scripts de verificacao, mas ainda nao tem uma camada clara de testes automatizados para contratos:

- `ReinaDataService`;
- `ItemDatabaseService`;
- `MonsterDatabaseService`;
- normalizacao;
- asset resolver;
- APIs.

### `files_repository` ainda precisa de politica formal

Ja existe a regra conceitual de nunca executar arquivos brutos. O proximo passo e documentar isso melhor e criar scanners que leiam apenas texto/binario seguro.

Especialmente para `.lua`, a estrategia deve ser:

- ler como texto;
- detectar padroes;
- gerar relatorios;
- nunca executar.

## 4. Sugestoes de evolucao

### Shared Components

Criar componentes compartilhados para reduzir duplicacao:

- `EntitySearchPanel`
- `EntityResultList`
- `EntityHeader`
- `MetricGrid`
- `MetricCard`
- `AssetImage`
- `LinkedEntityRow`
- `EmptyState`
- `InlineError`

Nao precisa fazer agora, mas vale quando o terceiro database nascer.

### Shared Services

Criar servicos pequenos e reaproveitaveis:

- `PublicAssetService`: verifica existencia de assets com cache.
- `EntityLinkService`: gera links entre itens, monstros, NPCs e bosses.
- `SearchService`: normaliza busca e ranking.
- `ApiResponseService`: padroniza respostas e erros das APIs.

### Entity Engine

Quando houver itens, monstros, NPCs, bosses, spells e quests, pode valer criar um "Entity Engine":

- contratos comuns de entidade;
- identificadores;
- imagens;
- aliases;
- links;
- busca;
- metadados futuros;
- relacoes entre entidades.

Isso evitaria criar uma arquitetura nova para cada database.

### Feature Registry

Criar um registro central de features:

- key;
- label;
- href;
- grupo;
- status;
- descricao;
- icone;
- dependencia de servidor ativo ou base local.

Esse registry poderia alimentar navegacao, dashboard e documentacao.

### Navigation Registry

Separar `HubNav` de uma lista fixa. A navegacao poderia ler grupos como:

- Ferramentas;
- Database;
- Economia;
- Studio;
- Admin.

Isso permitiria escalar sem redesenhar o menu a cada modulo.

### Global Search

Criar uma busca global que consulte:

- itens;
- monstros;
- NPCs;
- bosses;
- quests;
- hunts importadas;
- ferramentas.

Esse seria um recurso muito valioso porque o projeto esta virando um hub.

### Cache e indices server-side

Adicionar indices ao `ReinaDataService`:

- `lootByItemId`;
- `lootByItemName`;
- `itemsWithNpcPrice`;
- `monstersByLootItem`;
- `assetsByEntity`;

Isso melhora Item Database, Profit Calculator, Loot Analyzer e Bestiary.

### Lazy Loading

Continuar o principio atual:

- dados grandes no servidor;
- client recebe apenas o necessario;
- features carregam dados sob demanda por API.

Isso deve ser regra para qualquer modulo novo.

### Internacionalizacao

Nao e urgente, mas vale preparar:

- textos de UI em portugues;
- nomes tecnicos do Tibia em ingles;
- possibilidade de labels em `pt-BR` e `en`.

### Sistema de Plugins

No longo prazo, o ReinaHub poderia aceitar modulos isolados:

- novos analyzers;
- novos importadores;
- novos bancos de entidades;
- scripts de validacao.

Nao e prioridade agora, mas a arquitetura por features ja aponta nessa direcao.

### Scanner seguro de Lua

Como `files_repository` tera dados de OTServer, criar um scanner de `.lua` que apenas leia arquivos e gere relatorio:

- NPC shops;
- precos;
- quest rewards;
- spells;
- actions;
- raids;
- possiveis bosses;
- referencias de itens.

Esse scanner deve ser tratado como importador de biblioteca bruta, nunca executor de codigo.

## 5. Roadmap Tecnico

### Curto prazo

- Criar testes/scripts de contrato para `ItemDatabaseService` e `MonsterDatabaseService`.
- Criar `PublicAssetService` para remover duplicacao de `fs.existsSync` e cache de assets.
- Criar indices no `ReinaDataService` para lookup reverso de loot por item.
- Consolidar a regra de normalizacao em um unico modulo.
- Documentar politica de `files_repository`.
- Criar scanner seguro de `.lua` como relatorio, sem importar ainda.
- Melhorar README central do projeto com arquitetura atual e comandos.

### Medio prazo

- Transformar Hunt Analyzer em feature organizada.
- Transformar Cotacao Central, Market Analyzer e Calculadora RC em features.
- Criar `Feature Registry` e `Navigation Registry`.
- Criar componentes compartilhados de entidade.
- Criar Global Search.
- Unificar sistema antigo e novo de assets.
- Criar camada de API padronizada.
- Criar indices derivados para economia e loot.
- Criar testes automatizados para normalizacao, importadores e APIs.

### Longo prazo

- Criar Entity Engine para itens, monstros, NPCs, bosses, spells e quests.
- Criar Bestiary e Charms com base na entidade monstro.
- Criar Profit Engine usando hunt, loot, market, preco NPC e cotacao ativa.
- Criar sistema de perfil e preferencias.
- Criar historico persistente de analises.
- Criar plugin system para modulos externos.
- Criar painel admin/local para reimportar dados, validar assets e revisar pendencias.

## 6. Roadmap Funcional

### Biblioteca

- Item Database.
- Monster Database.
- NPC Database.
- Boss Database.
- Spell Database.
- Quest Database.
- Outfit/Mount Database.
- Bestiary.
- Charms.
- Weakness/Resistance Library.

### Ferramentas

- Hunt Analyzer.
- Loot Analyzer.
- Calculadora RC/Tibia Coin.
- Calculadora de Profit.
- Calculadora de Supplies.
- Calculadora de Imbuement.
- Calculadora de Bless/Death Cost.
- Comparador de hunts.

### Economia

- Cotacao Central.
- Market Analyzer.
- Historico de preco.
- Conversao TC/gold/BRL.
- Simulador compra/venda de TC.
- Ranking de itens por lucro.
- Alertas de preco.

### Studio

- Assets Manager.
- Asset Inbox.
- Scanner de assets.
- Prioridade de assets.
- Exportadores PNG/PDF.
- Gerador de cards.
- Biblioteca visual de sprites.

### Administracao

- Importadores XML.
- Scanner seguro Lua.
- Validadores.
- Data cleaning/manual mappings.
- Relatorios de pendencias.
- Painel de integridade da base.

### Perfil

- Servidor ativo.
- Preferencias locais.
- Historico de cotacoes.
- Historico de analises.
- Presets de hunt.
- Configuracoes de exibicao.

## 7. O que NAO devemos fazer agora

- Nao criar banco externo ainda. JSON local e suficiente para esta fase.
- Nao criar autenticacao ou contas de usuario agora.
- Nao criar sistema de plugins antes das features principais estabilizarem.
- Nao redesenhar a UI inteira.
- Nao migrar tudo para uma arquitetura complexa de uma vez.
- Nao criar uma API generica demais antes de entender os proximos modulos.
- Nao executar arquivos de `files_repository`.
- Nao importar `.lua` direto para a base final sem scanner e relatorio previo.
- Nao buscar assets automaticamente na internet como fluxo principal.
- Nao adicionar dependencias grandes sem necessidade clara.
- Nao colocar JSONs grandes novamente em componentes client.
- Nao misturar dados brutos, dados limpos e dados usados pelo app na mesma pasta.

## 8. Divida tecnica

- Consolidar `services/image-resolver.ts` com o novo `asset-resolver.ts`.
- Revisar `source/assets`, `public/images` e `public/assets` para definir um unico caminho oficial.
- Extrair a verificacao de existencia de asset para um servico compartilhado.
- Criar indice reverso de loot por item.
- Padronizar respostas de API.
- Padronizar mensagens de erro e loading nos componentes.
- Criar componentes compartilhados para busca/detalhe de entidades.
- Reduzir duplicacao entre Item Database e Monster Database.
- Mover gradualmente ferramentas antigas para `source/web/src/features`.
- Criar testes de contrato para servicos centrais.
- Documentar comandos principais no README raiz.
- Melhorar tipagem dos blocos `future`, que hoje sao placeholders intencionais.
- Revisar se `quote-service` deve viver em `reina-core`, `features/cotacao` ou `services`.
- Criar politica formal para arquivos gerados em `generated/`.
- Criar scripts de limpeza/regeracao previsiveis.

## Proxima funcionalidade recomendada

A proxima funcionalidade que eu implementaria seria o scanner seguro de `.lua` em `files_repository`.

Motivo:

- aumenta muito a qualidade da biblioteca de dados sem mexer no visual;
- respeita a estrategia de usar OTServer como fonte bruta, nunca como codigo executavel;
- pode revelar NPC shops, quest rewards, spells, actions, bosses e referencias de itens;
- fortalece Item Database, Monster Database, Loot Analyzer, Profit Calculator e futuras quests;
- gera relatorio antes de qualquer importacao, mantendo o projeto seguro e reversivel.

Eu nao criaria ainda uma tela para isso. Primeiro faria apenas o scanner e os relatorios, do mesmo jeito que a base de dados e assets foram consolidados antes de virar interface.
