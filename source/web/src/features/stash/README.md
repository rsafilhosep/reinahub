# Stash

O Stash e o inventario pessoal do ReinaHub.

## Objetivo

- Registrar manualmente itens que o jogador possui.
- Usar o Item Database para identificar item, imagem, categoria e preco NPC quando existir.
- Usar a Cotacao Central para converter GC em moeda premium e reais.
- Calcular patrimonio total em GC, moeda premium e BRL.

## Fonte dos dados

- `Item Database`: itemId, nome, imagem, categoria e preco NPC.
- `Cotacao Central`: servidor ativo, GC por moeda premium e valores em reais.
- `ProfileService`: perfil ativo do jogador, vinculado a um servidor/mundo.
- `StorageService`: itens salvos localmente no navegador do usuario, separados por perfil.

## Perfis

Cada perfil possui seu proprio Stash. Isso permite separar, por exemplo:

- itens do `Tibia Global - Yubra`;
- itens do `RubinOT - Elysian`;
- futuros objetivos e historico de hunt por personagem/mundo.

Os dados antigos do Stash sao migrados automaticamente para o perfil ativo na primeira leitura.

## Futuro OCR

A leitura por print do Stash deve ser uma etapa separada:

1. detectar possiveis imagens/quantidades;
2. mostrar revisao manual;
3. salvar apenas itens confirmados;
4. nunca substituir automaticamente o stash atual sem confirmacao.
