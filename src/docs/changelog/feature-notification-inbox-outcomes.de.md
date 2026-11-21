# Verlässlicher Posteingang

**Feature-Zweig:** feature-notification-inbox-outcomes

## Bestätigten Zustand erhalten

Fehlgeschlagene Leseanfragen erhalten bestätigte Benachrichtigungen, Suchergebnisse und ungelesene Zähler. „Erneut versuchen“ prüft den Posteingang ohne erneute Schreibanfrage. Abgelehnte, unbestätigte und bestätigte Änderungen mit fehlgeschlagener Aktualisierung erhalten unterschiedliche Meldungen.

## Lebensdauer berücksichtigen

Interne Benachrichtigungen 0.5.36 gleichen Inhalt, Reihenfolge und Lesestatus über adaptereigene Abläufe ab. Veraltete Anfragen, entfernte Steuerelemente, Kontowechsel und Provider-Entfernung können keinen neueren Posteingang überschreiben. Regeln für kontinuierliche Popups und Tutorial-Ziele bleiben unverändert.

## Commits

- [8258aae680b6049b091f6af88d87e7dd0cfdcf77](https://github.com/Cognis-Labs-HQ/Cognis/commit/8258aae680b6049b091f6af88d87e7dd0cfdcf77)
- [d88df86fe5c20571ba8134db71bbbeeecf9c1820](https://github.com/Cognis-Labs-HQ/Cognis/commit/d88df86fe5c20571ba8134db71bbbeeecf9c1820)
- [0dce5557f24f3f32f34286fff1af710389b5de5c](https://github.com/Cognis-Labs-HQ/Cognis/commit/0dce5557f24f3f32f34286fff1af710389b5de5c)
