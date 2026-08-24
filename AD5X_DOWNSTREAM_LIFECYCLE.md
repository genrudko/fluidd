# AD5X Fluidd downstream lifecycle

## Current acceptance mode

Before the first live AD5X deployment, preserve the current Z-Mod Fluidd webroot as a local baseline. The first acceptance must prove this sequence without depending on GitHub for rollback:

`current /root/fluidd -> local backup -> AD5X build -> local rollback -> original /root/fluidd`

The deploy script already stores the pre-deploy tree under `/opt/config/mod_data/ad5x_custom/backups` and rollback reads that local copy. For the first hardware acceptance, also keep a separately named manual baseline until the modified frontend is proven stable.

## Target lifecycle after acceptance

The long-term model is a thin downstream patchset, not a frozen replacement:

`Sergey/Z-Mod Fluidd upstream -> genrudko/fluidd base -> ad5x-dev overlay -> CI -> ad5x-dist -> AD5X`

The exact upstream remote/branch must be pinned before automation. Upstream sync automation is intentionally deferred until the local backup/deploy/rollback path is accepted on real AD5X hardware.

## Invariants

- Keep AD5X changes isolated under `src/ad5x` plus minimal Fluidd integration hooks.
- Never silently overwrite the only known-good stock/Z-Mod Fluidd copy.
- A failed deploy must restore the previous local webroot and restart only the Z-Mod HTTP service.
- Klipper and Moonraker are outside the Fluidd deploy/rollback path.
- Upstream refresh must re-run AD5X tests, type-check, lint, circular-check and production build before publishing `ad5x-dist`.
