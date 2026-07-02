# ReinaHub Repository Scanner

`files_repository` e uma biblioteca bruta de referencia. Ela pode conter arquivos de OTServer, XML, Lua, sprites, documentos e outros materiais para estudo.

## Regra de seguranca

Arquivos dentro de `files_repository` sao apenas leitura.

O ReinaHub nao deve executar arquivos dessa pasta. O scanner de Lua le os arquivos `.lua` como texto e procura padroes conhecidos, mas nao usa `require`, nao carrega modulos Lua e nao roda nenhum script.

## Comando

```bash
npm run repository:scan-lua
```

## Relatorios gerados

Os relatorios ficam em:

`source/web/src/reina-core/repository/generated/`

Arquivos:

- `lua-files-report.json`: inventario dos arquivos `.lua` encontrados.
- `lua-npc-candidates.json`: possiveis scripts relacionados a NPCs.
- `lua-monster-candidates.json`: possiveis scripts relacionados a monstros ou loot.
- `lua-shop-candidates.json`: possiveis scripts relacionados a shops, trade, compra e venda.
- `lua-risk-report.json`: arquivos com termos que merecem revisao manual, separados por severidade.
- `lua-high-risk-review.json`: lista curta de ocorrencias high para revisao manual.
- `lua-high-risk-active.json`: ocorrencias high que ainda nao estao na allowlist manual.

## Severidade do risk report

High:

- `os.execute`
- `io.popen`
- `loadstring`
- `socket`
- `http`
- `webhook`

Medium:

- `require`
- `dofile`
- `io.open`

Low:

- `token`
- `password`
- `secret`
- `key`

O scanner ignora alguns falsos positivos comuns quando aparecem como nomes de itens ou textos conhecidos:

- `gold token`
- `silver token`
- `secret service`
- `secret agent`
- `key ring`

## Revisao manual de HIGH

O arquivo `lua-high-risk-review.json` sempre mantem a lista completa de ocorrencias high encontradas.

Quando uma ocorrencia for revisada e confirmada como falso positivo, adicione uma entrada em:

`source/web/src/reina-core/repository/lua-risk-allowlist.json`

Formato:

```json
{
  "entries": [
    {
      "filePath": "files_repository\\06_30_2026\\example.lua",
      "term": "http",
      "lineNumber": 10,
      "reason": "URL appears only inside NPC flavor text."
    }
  ]
}
```

Depois rode:

```bash
npm run repository:scan-lua
```

O scanner vai continuar gerando `lua-high-risk-review.json` completo, mas `lua-high-risk-active.json` mostrara apenas o que ainda precisa de revisao.

## Uso dos dados

Esses relatorios sao apenas para estudo.

Nada encontrado pelo scanner e importado automaticamente para `ReinaDataService`, Item Database, Monster Database, Hunt Analyzer ou qualquer outra ferramenta.

Quando um padrao for confiavel, ele deve virar um importador especifico, com validacao e relatorio proprio, antes de entrar na base local do ReinaHub.
