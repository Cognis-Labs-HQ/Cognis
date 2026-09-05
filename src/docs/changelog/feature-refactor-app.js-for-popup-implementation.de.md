# Erweiterbare Popups für Bibliothekseinträge

**Feature-Zweig:** feature-refactor-app.js-for-popup-implementation

## Routengestützte Eintragsdetails

Bibliothekseinträge öffnen sich in übersichtlichen, verlaufsfähigen Popups mit verfügbaren Metadaten, Beziehungen, Vor-/Zurück-Navigation und einheitlichen Benutzermenü-Schaltflächen in der Study-Navigation.

## Erweiterbare Detailzusammenstellung

Der Detailablauf wird vor den UI-Anbietern deklariert, bewahrt die Reihenfolge vor Kern, Kern und nach Kern, unterstützt entfernbare Hooks und führt beigetragene Popup-Aktionen aus.

## Zuverlässiger Seitenlebenszyklus

Direkte Aufrufe und SPA-Wechsel verwenden den standardmäßigen authentifizierten Seiten-Composer-Lebenszyklus und behalten ein einzeiliges, einheitlich dimensioniertes Study-Untermenü bei. Kanonische Eintragslinks bleiben teilbar, abgebrochene Einbindungen öffnen keine veralteten Popups und die Popup-Schließen-Schaltfläche funktioniert wie erwartet. Study-URLs enthalten keinen `language`-Abfrageparameter mehr; die aktive Sprachschaltfläche speichert ihren ISO-Code und stellt die Auswahl bei der Navigation bereit.

## Study-eigene Sprachnavigation

Study verarbeitet die Navigation über Sprachschaltflächen nun über seine eigene UI-Fähigkeitsbindung, ohne den zentralen App-Router mit Study-Zustand zu koppeln. Direkte Eintragsrouten ermitteln ihre Schemasprache vor dem Rendern und direkt geladene Listen reagieren korrekt auf die Zurück-Navigation.

## Commits

- [f25e2f64](https://github.com/Cognis-Labs-HQ/Cognis/commit/f25e2f649aadef46a713e85d70d627370f60ba5c)
- [160cbba5](https://github.com/Cognis-Labs-HQ/Cognis/commit/160cbba5e9344f11c429f4c8f8ae2ba4ceda468b)
- [a6b4a095](https://github.com/Cognis-Labs-HQ/Cognis/commit/a6b4a09575d55c2d74e28d58a85beecd832e8c6c)
- [fc4bd3f5](https://github.com/Cognis-Labs-HQ/Cognis/commit/fc4bd3f53c620345d597e94cdfd5f8b611b5c02c)
- [e0e89430](https://github.com/Cognis-Labs-HQ/Cognis/commit/e0e894300370247239ce4b1811a56336db0b3e1c)
- [13886e88](https://github.com/Cognis-Labs-HQ/Cognis/commit/13886e885724482b15279da0c5f0e949ab16fdc9)
