# Game Assets System

## Estrutura

- `source/assets/monsters`
- `source/assets/items`
- `source/assets/npcs`
- `source/assets/bosses`
- `source/assets/outfits`
- `source/assets/mounts`
- `source/assets/spells`
- `source/assets/icons`
- `source/assets/metadata`
- `public/images`

## Fluxo

1. Adicione imagens na categoria correta dentro de `source/assets`.
2. Rode `npm run assets:sync`.
3. O script normaliza os nomes, copia para `public/images` e atualiza `source/assets/metadata/asset-manifest.ts`.
4. Componentes usam `ImageResolver`; nenhum modulo deve montar caminho manualmente.

## Normalizacao

`Mooh'Tah Warrior` vira `mooh-tah-warrior`.

`Platinum Coin` vira `platinum-coin`.

## API

- `resolveMonsterImage(name)`
- `resolveItemImage(name)`
- `resolveNpcImage(name)`
- `<MonsterAvatar name size className />`
- `<ItemAvatar name size className />`
- `<NpcAvatar name size className />`

O retorno inclui placeholder automatico quando a imagem nao esta no manifesto.

## Preparacao futura

`GameAssetMetadata` ja reserva campos para HP, XP, Loot, Bestiary, Weakness, Charm, Race, Location e Wiki URL sem mudar a API dos componentes.
