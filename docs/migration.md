# Migracao Vault of Thais para ReinaHub

## Migrado

- Tema dark medieval centralizado em `app/globals.css`.
- Navegacao de hub compartilhada em `components/HubNav.tsx`.
- Layout, tabs, paineis, cards e slots reutilizaveis em `components/`.
- `StorageService` para leituras/escritas de `localStorage`.
- Cotacao Central como fonte unica de servidor ativo e conversoes.
- Calculadora RC lendo automaticamente a cotacao ativa.
- Market Analyzer usando a cotacao ativa para equivalencia em moeda premium e reais.
- Hunt Analyzer com leitura de JSON, resumo da hunt, conversao pela cotacao ativa e exportacao PNG/PDF.
- Assets Manager com fila, cache local de sprites, retry de erros e limpeza de cache.

## Compatibilidade preservada

- `vot_theme`
- `vot_servers`
- `vot_active_server`
- `vot_quote_history`
- `ma_history`
- `rc_history`
- `vot_sprite_cache`
- `vot_sprite_meta`

## Pendencias recomendadas

- Validar formatos alternativos de JSON de hunt antes de importar.
- Adicionar testes unitarios para formulas de conversao e analise de market.
- Melhorar edicao de servidores existentes na Cotacao Central.
- Adicionar persistencia opcional em backend caso o ReinaHub deixe de ser apenas local.
- Integrar sprites cacheados dentro do Hunt Analyzer para mostrar imagens de monstros no relatorio.
