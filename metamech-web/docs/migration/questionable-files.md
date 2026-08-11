# Questionable Files (not deleted)

| Item | Location | Why questionable | Decision |
|------|----------|------------------|----------|
| `public/models/` GLB/GLTF | MetaMech_2026 / formerly `apps/mdat/public/models` | Large simulation assets unused by MDAT marketing | Excluded from monorepo git; retained in source repo SHA `72fe5ac` |
| `metamech-trial.rar` | `apps/mdat/public/` | Download page uses GitHub Releases zip, not this rar | Kept; do not delete without confirming no link |
| Hardcoded Formspree/Stripe/GA | MDAT + older clones | Should move to env before launch | Documented; not rewritten aggressively |
| Broken `/features` links | MDAT about / solidworks pages | Pre-existing | REVIEW later; not redesigned away |
| README claims (10k+ downloads, quotes) | `apps/mdat/README.md` | May be unverified marketing | Left untouched in preserved MDAT import |
