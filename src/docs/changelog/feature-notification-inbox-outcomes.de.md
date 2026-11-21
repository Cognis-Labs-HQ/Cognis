# Verlässlicher Posteingang

**Feature-Zweig:** feature-notification-inbox-outcomes

## Bestätigten Zustand erhalten

Fehlgeschlagene Leseanfragen erhalten bestätigte Benachrichtigungen, Suchergebnisse und ungelesene Zähler. „Erneut versuchen“ prüft den Posteingang ohne erneute Schreibanfrage. Abgelehnte, unbestätigte und bestätigte Änderungen mit fehlgeschlagener Aktualisierung erhalten unterschiedliche Meldungen.

## Lebensdauer berücksichtigen

Interne Benachrichtigungen 0.5.36 gleichen Inhalt, Reihenfolge und Lesestatus über adaptereigene Abläufe ab. Veraltete Anfragen, entfernte Steuerelemente, Kontowechsel und Provider-Entfernung können keinen neueren Posteingang überschreiben. Regeln für kontinuierliche Popups und Tutorial-Ziele bleiben unverändert.

## Commits

- [43d6a5ae8fd964d097a1689d54aafd1b0483e30d](https://github.com/Cognis-Labs-HQ/Cognis/commit/43d6a5ae8fd964d097a1689d54aafd1b0483e30d)
- [ab9b731fe6960c954ebfb79df6e28ee5fd0d401a](https://github.com/Cognis-Labs-HQ/Cognis/commit/ab9b731fe6960c954ebfb79df6e28ee5fd0d401a)
- [b8d3ebd1c83345ef615ee397a3c6310bcff61f65](https://github.com/Cognis-Labs-HQ/Cognis/commit/b8d3ebd1c83345ef615ee397a3c6310bcff61f65)
