Rådata och kurering för de inspelade körningarna, se `docs/INSPELNING.md`.

- `2026-11-16.md`: åtta körningar (fyra frågor, två tjänster), oförändrade. Tjänsternas namn står bara här.
- `kurering.json`: etikett (Tjänst A/B), vilken sida i korpuset varje hänvisning går till, och de kontrollerade meningarna.

Kör `node scripts/inspelning_till_json.mjs` efter en ändring. Det skriver `public/data/inspelningar.json`.
