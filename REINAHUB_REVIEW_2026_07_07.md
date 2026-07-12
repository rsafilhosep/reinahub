# ReinaHub Review - 2026-07-07

Revisao critica do estado atual do ReinaHub apos a criacao de perfis, Stash, Live Goal, databases e consolidacoes de dados.

## 1. Estado atual

O ReinaHub esta estavel e buildando. A arquitetura ja possui uma base consistente:

- Cotacao Central como catalogo de servidores/cotacoes.
- `ProfileService` como contexto de jogador/personagem/mundo.
- `ReinaDataService` como fonte local de itens, monstros, loot, NPCs e precos.
- APIs server-side para evitar JSON grande no client.
- Stash manual por perfil.
- Hunt Analyzer com importacao por arquivo e texto colado.
- Market Analyzer integrado ao Item Database.
- Item Database, Monster Database e NPC Hub.
- Imbuement Database inicial.
- Premium Goals e Live Goal.
- Assets locais, scanners e importadores seguros.
- Data source policy para nao depender de sites externos em runtime.

Validacoes recentes:

- `npm run architecture:verify`: ok.
- `npm run database:verify`: ok.
- `npm run assets:verify`: ok.
- `npm run build`: ok.

## 2. Pontos fortes

- A direcao de produto esta clara: o ReinaHub nao tenta ser uma wiki; ele tenta transformar dados em decisao pratica para o jogador.
- A Cotacao Central ja resolve uma dor real de OTServer/global: moedas, gold e reais mudam por mundo.
- A nova camada de perfis e essencial para separar patrimonios de mundos/personagens diferentes.
- O Stash tem potencial de virar o centro economico pessoal do app.
- O Hunt Analyzer ja entrega valor real: importar sessao, enriquecer loot, calcular e exportar.
- O Live Goal ficou forte para streamer/criador de conteudo e conversa bem com Premium Goals.
- O pipeline de NPC trades esta maduro: 281 NPCs, 12.108 trades e zero trades pendentes no relatorio atual.
- O projeto tem politica correta para fontes externas: estudar, gerar relatorio, importar localmente com revisao, nunca depender em runtime.
- O `architecture:verify` ja evita alguns erros de acoplamento entre client/server.

## 3. Pontos de atencao

### 3.1 Muitas frentes parciais

Existem muitas ideias boas em andamento. Isso e positivo, mas agora o risco e espalhar energia:

- Premium Goals ainda usa catalogo placeholder.
- Live Goal ainda nao tem lista de varios objetivos salvos.
- Stash ainda nao compara uma cotacao contra outra.
- Imbuements ainda precisa de mais receitas, presets e integracao economica mais forte.
- Hunt History existe, mas ainda pede polimento.
- NPC Hub tem trades, mas ainda carece de cidade/localizacao/imagens melhores.
- Spell Database ainda nao comecou.
- Boss Database e Loot Analyzer ainda sao placeholders.

### 3.2 Cobertura de assets de itens ainda baixa

`assets:verify` atual:

- Itens totais: 38.116.
- Imagens de itens encontradas: 95.
- Imagens de itens faltantes: 38.021.
- Monstros totais: 1.765.
- Imagens de monstros encontradas: 804.
- Imagens de monstros faltantes: 961.

Conclusao: monstros ja evoluiram muito; itens agora sao o gargalo visual.

### 3.3 Taxonomia ainda e camada de revisao

Relatorio atual:

- Itens classificados: 4.289 de 38.078.
- Itens sem classificacao confiavel: 33.789.
- Monstros classificados: 640 de 1.765.
- Monstros sem classificacao: 1.125.

Conclusao: categorias devem ser usadas com cuidado e com indicacao de confianca.

### 3.4 Perfil precisa virar contexto global

Hoje o Stash ja usa perfil. Mas varias ferramentas ainda pensam principalmente em "servidor ativo":

- Premium Goals.
- Live Goal.
- Hunt History.
- Imbuement Market prices.
- Market Analyzer history.

Recomendacao: a partir de agora, dados pessoais devem usar perfil; dados de cotacao devem usar servidor/cotacao.

### 3.5 Navegacao e dashboard ainda sao manuais

`HubNav` e Home possuem listas manuais. Funciona, mas com mais modulos pode virar divergencia.

Recomendacao: criar `Feature Registry` antes de adicionar muitos modulos novos.

## 4. Projetos em aberto

| Area | Estado | Proximo fechamento recomendado |
| --- | --- | --- |
| Profiles | Parcial | Expandir uso do perfil para objetivos e historico de hunts. |
| Stash | Parcial | Comparativo por cotacao entregue; proximo passo e exportacao simples e leitura por perfil em outros modulos. |
| Live Goal | Parcial | Permitir varios objetivos salvos e selecionar asset local. |
| Premium Goals | Parcial | Catalogar produtos reais de TC/RC e permitir override por servidor/perfil. |
| Hunt Analyzer | Parcial | Amarrar hunts ao perfil ativo e melhorar history/graficos. |
| Imbuements | Parcial | Expandir receitas e usar precos por perfil/servidor com mais clareza. |
| Item Assets | Parcial | Focar top missing images por uso real. |
| NPC Hub | Parcial | Completar cidade/localizacao e imagens. |
| Spell Database | Pendente | Comecar base local pequena e auditavel. |
| Boss Database | Pendente | Separar bosses de monstros comuns quando houver dado confiavel. |
| Loot Analyzer | Pendente | Definir se sera modulo separado ou evolucao do Hunt/Stash. |

## 5. Critica como desenvolvedor

O projeto esta na hora certa de consolidar, nao de explodir em novas telas.

Prioridades tecnicas:

1. Fazer `ProfileService` virar contexto oficial para dados pessoais.
2. Criar comparadores usando services, nao logica solta em pagina.
3. Criar `Feature Registry` para Home e HubNav.
4. Criar service comum para historicos locais.
5. Melhorar cobertura de item assets por prioridade, nao por quantidade bruta.
6. Atualizar documentacao sempre que uma feature muda de parcial para feito.

Evitar agora:

- Redesign grande.
- Crawler agressivo.
- Autenticacao.
- Banco externo.
- Muitas paginas novas antes de fechar Stash/Profiles/Hunt.

## 6. Critica como jogador

O que mais tem valor pratico para um jogador agora:

1. Saber quanto vale meu patrimonio em cada mundo.
2. Saber quanto falta para comprar Premium, Loot Pouch, outfit, mount ou objetivo custom.
3. Saber se uma hunt esta me aproximando da meta.
4. Saber quais itens valem vender no NPC, guardar, ou vender no market.
5. Ver imagens e nomes corretos para confiar no resultado.

O caminho mais forte do ReinaHub e:

`Perfil -> Stash -> Cotacao -> Objetivo -> Hunt -> Comparativo`

Isso cria uma narrativa real:

"Estou no RubinOT, tenho esses itens, quero comprar X, falta Y, minhas hunts geram Z por hora, e em outro servidor isso valeria W."

## 7. Roadmap recomendado

### Curto prazo

1. Fazer Premium Goals e Live Goal reconhecerem perfil ativo.
2. Atualizar Home/HubNav via Feature Registry.
3. Rodar `library:coverage` e atacar top 50 imagens de itens faltantes.
4. Amarrar Hunt History ao perfil ativo.
5. Atualizar `REINAHUB_PROGRESS.md` apos cada fechamento.

### Medio prazo

1. Amarrar Hunt History ao perfil ativo.
2. Criar presets de objetivos por perfil.
3. Expandir Imbuements e usar no Hunt Analyzer.
4. Melhorar NPC Hub com cidade/localizacao.
5. Criar Spell Database inicial.

### Longo prazo

1. Entity Engine para Item/Monster/NPC/Boss/Spell.
2. Global Search.
3. Profit Engine.
4. Bestiary/Charms.
5. OCR assistido para Stash com revisao manual.

## 8. Proxima implementacao recomendada

Fazer objetivos e historico pessoal respeitarem perfil ativo.

Motivo:

- aproveita imediatamente o `ProfileService`;
- evita que Premium Goals, Live Goal e Hunt History misturem mundos/personagens;
- fortalece a ideia de contexto unico do jogador;
- prepara Profile Compare futuro com menos retrabalho.

Primeira versao sugerida:

- Live Goal salvar objetivo por perfil ativo;
- Premium Goals salvar override/progresso por perfil quando for dado pessoal;
- Hunt History salvar sessoes com `profileId`;
- manter cotacoes como catalogo separado dos dados pessoais.
