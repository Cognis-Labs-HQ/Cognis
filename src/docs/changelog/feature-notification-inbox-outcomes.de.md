# Verlässlicher Posteingang

**Feature-Zweig:** feature-notification-inbox-outcomes

## Bestätigten Zustand erhalten

Fehlgeschlagene Leseanfragen erhalten bestätigte Benachrichtigungen, Suchergebnisse und ungelesene Zähler. „Erneut versuchen“ prüft den Posteingang ohne erneute Schreibanfrage. Abgelehnte, unbestätigte und bestätigte Änderungen mit fehlgeschlagener Aktualisierung erhalten unterschiedliche Meldungen.

## Lebensdauer berücksichtigen

Interne Benachrichtigungen 0.5.36 gleichen Inhalt, Reihenfolge und Lesestatus über adaptereigene Abläufe ab. Veraltete Anfragen, entfernte Steuerelemente, Kontowechsel und Provider-Entfernung können keinen neueren Posteingang überschreiben. Regeln für kontinuierliche Popups und Tutorial-Ziele bleiben unverändert.

## Commits

- [c96b6c2464859bf1ce5ec0e36746f3459bd297ff](https://github.com/Cognis-Labs-HQ/Cognis/commit/c96b6c2464859bf1ce5ec0e36746f3459bd297ff)
