# UI-Anbieter für Module

**Feature-Zweig:** work

## Externe Module können Browser-Anbieter veröffentlichen

Der Bootstrap-Kontext für externe Module stellt nun `registerCapabilityProvider` bereit, sodass moduleigene Browser-Gateways in den UI-Anbieterkatalog aufgenommen werden können. Anbieterregistrierungen sind an den Lebenszyklus des Moduls gebunden und werden entfernt, wenn das Modul deaktiviert oder aktualisiert wird oder der Bootstrap fehlschlägt.

## Commits

- [1213125](https://github.com/Cognis-Labs-HQ/Cognis/commit/121312516048ee5d51bfa6f378cd363264d668bb)
