# Reina Active Context

Camada central para responder qual contexto o ReinaHub deve usar em ferramentas pessoais.

## O que ela junta

- Perfil ativo (`ProfileService`)
- Servidor/cotacao ativa (`ReinaEconomyService`)
- Personagem ativo (`CharacterProfileService`)

## Regra

Novas features que dependem de mundo, personagem, stash, metas ou economia devem preferir:

```ts
ReinaActiveContextService.getActiveContext()
```

em vez de consultar separadamente:

- servidor ativo;
- perfil ativo;
- personagem ativo.

Isso reduz o risco de misturar dados de Yubra, RubinOT, DeusOT ou outros perfis.

## Uso esperado

- Banner global: mostra contexto ativo.
- Characters: lista e seleciona personagens do perfil ativo.
- Stash: deve continuar evoluindo para perfil ativo.
- Hunt History: novas hunts sao salvas com `profileId`, `characterId` e servidor; historico antigo sem profile continua aparecendo por compatibilidade quando bate com o servidor.
- Premium Goals: progresso salvo por produto dentro do contexto ativo.
- Live Goal: objetivos novos sao salvos com perfil/personagem/servidor; overlay por link continua usando `id`.
