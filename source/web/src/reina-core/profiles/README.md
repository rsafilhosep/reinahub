# Profiles

Profiles separate the player context from the quote/server catalog.

## Why

A server quote answers: how much is one premium currency worth on this world.

A profile answers: which character/stash/objectives belong to this player context.

Examples:

- `Yubra RP` linked to `Tibia Global - Yubra`
- `RubinOT EK` linked to `RubinOT - Elysian`

## Current use

- `ProfileService` stores profiles in localStorage through `StorageService`.
- The active profile is used by Stash to isolate saved items per profile.
- Existing old stash data is migrated automatically into the active profile key.

## Future use

- Profile goals
- Hunt history per profile
- Profile comparison using another server quote
- Multi-world patrimony comparison
