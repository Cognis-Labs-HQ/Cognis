# Routengestützte Detailansicht für Bibliothekseinträge

**Feature-Zweig:** feature-refactor-app.js-for-popup-implementation

## Tief verlinktes Eintrags-Popup

Bibliothekseinträge öffnen sich nun als erweiterbare, routengestützte Popups mit allen verfügbaren Metadaten, Beziehungslinks, beigetragenen Aktionen sowie Vor-/Zurück-Navigation.

## Saubere Bibliotheks-URLs

Die Identität des Eintrags wird nun im Browser-Verlaufszustand statt in der Adressleiste gespeichert. Aktualisieren und Browsernavigation erhalten das aktive Popup; bisherige Direktlinks werden auf die saubere Bibliotheks-URL umgestellt.

## Zuverlässiges Neuladen der Seite

Direkte Bibliotheksaufrufe verwenden nun den gemeinsamen authentifizierten Seiteneinstiegszyklus, sodass UI-Anbieter und der Seitenladeablauf vor dem Einbinden der Bibliothek bereitstehen.

## Beständiges Study-Untermenü

Die Bibliothek übergibt die Study-Navigation nun als standardmäßige renderbare Beschreibung an den Seiten-Composer, sodass das Sprach- und Modul-Untermenü bei direkten Aufrufen und SPA-Wechseln sichtbar bleibt.

## Einheitliche Untermenü-Schaltflächen

Die Links im Study-Untermenü verwenden nun dieselbe Schaltflächenklasse `dropdown-item` wie das Benutzermenü; die bisherigen eigenen Linkklassen und Stile wurden entfernt.

## Commits

- https://github.com/Cognis-app/Cognis/commit/f29be454
- https://github.com/Cognis-app/Cognis/commit/3695db82
- https://github.com/Cognis-app/Cognis/commit/fbf97f59
- https://github.com/Cognis-app/Cognis/commit/ed1f8f31
- https://github.com/Cognis-app/Cognis/commit/e9c8891b
