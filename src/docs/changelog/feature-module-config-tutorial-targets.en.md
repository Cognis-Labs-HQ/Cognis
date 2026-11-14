# Public Module Settings Tutorial Targets

**Feature Branch:** feature-module-config-tutorial-targets

## Public Module Settings Tutorial Targets

The public ui:moduleTutorialTargets capability exposes settings(id), field(id,key), action(id,key) and preview(id) alongside card(id), all scoped to the caller’s signal. Settings handles provide a popup selector for tutorial modal authorization. bindSettings(id,{signal}) binds pending preparation and the open editor to a branch; settingsSignal(id) is consumed by the owning editor. Adapter entry targets use adapterSettings(gateway,id) and revealAdapter(gateway,id). Only the owner resolves host controls; closing or another module’s popup never supplies a target.

## Commits

- [c912fb8](https://github.com/Cognis-Labs-HQ/Cognis/commit/c912fb8834fc6ccf38021fcc91267495d849bdb0)
