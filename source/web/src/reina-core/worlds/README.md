# World Catalog

Local catalog used only to help fill the Cotacao Central server/world form.

## Sources

- Tibia Global worlds: generated from TibiaData worlds API, which mirrors data from the official Tibia worlds page.
- DeusOT worlds: generated from `https://deusot.com/p/serverinfo`.
- RubinOT worlds: generated from `https://wiki.rubinot.com/pt-BR`.

## Rules

- The app does not fetch these sites at runtime.
- Generated data is only a suggestion for the form.
- User values still win: currency, lot size, gold per premium currency and BRL prices can be edited.

## Command

```bash
npm run worlds:refresh
```

The command writes:

- `source/web/src/reina-core/worlds/generated/world-catalog.json`
