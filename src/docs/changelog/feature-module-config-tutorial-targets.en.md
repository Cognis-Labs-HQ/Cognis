# Public Module Settings Tutorial Targets

**Feature Branch:** feature-module-config-tutorial-targets

## Public Module Settings Tutorial Targets

The public ui:moduleTutorialTargets capability exposes settings(id), field(id,key), action(id,key) and preview(id) alongside card(id), all scoped to the caller’s signal. Settings handles provide a popup selector for tutorial modal authorization. bindSettings(id,{signal}) binds pending preparation and the open editor to a branch; settingsSignal(id) is consumed by the owning editor. Adapter entry targets use adapterSettings(gateway,id) and revealAdapter(gateway,id). Only the owner resolves host controls; closing or another module’s popup never supplies a target.

## Use Published Popup Contracts

Settings cancellation uses the protected dismissal callback supplied to onOpen; requestClose is an onAction-only operation. Tests model that distinction. Generic and custom adapter editors publish gateway and adapter identity through the injected popup wrapper, matching the selector returned by adapterSettings(). Nested confirmation dialogs retain their own identity.

## Commits

- [ad94587](https://github.com/Cognis-Labs-HQ/Cognis/commit/ad945875c919d504058437aab92449d254d79aa8)
