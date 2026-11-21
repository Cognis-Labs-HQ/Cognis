# Verlässlicher Posteingang

**Feature-Zweig:** feature-notification-inbox-outcomes

## Bestätigten Zustand erhalten

Fehlgeschlagene Leseanfragen erhalten bestätigte Benachrichtigungen, Suchergebnisse und ungelesene Zähler. „Erneut versuchen“ prüft den Posteingang ohne erneute Schreibanfrage. Abgelehnte, unbestätigte und bestätigte Änderungen mit fehlgeschlagener Aktualisierung erhalten unterschiedliche Meldungen.

## Lebensdauer berücksichtigen

Interne Benachrichtigungen 0.5.36 gleichen Inhalt, Reihenfolge und Lesestatus über adaptereigene Abläufe ab. Veraltete Anfragen, entfernte Steuerelemente, Kontowechsel und Provider-Entfernung können keinen neueren Posteingang überschreiben. Regeln für kontinuierliche Popups und Tutorial-Ziele bleiben unverändert.

## Commits

- [cfe7a4001e6be4f26b15e82b199d18edbb2be42e](https://github.com/Cognis-Labs-HQ/Cognis/commit/cfe7a4001e6be4f26b15e82b199d18edbb2be42e)
- [faba21400a8fa7680a3e4e8f48aad4d05eab7a7e](https://github.com/Cognis-Labs-HQ/Cognis/commit/faba21400a8fa7680a3e4e8f48aad4d05eab7a7e)
- [024c4b6996da3c2f45a66ff876480140e245a3be](https://github.com/Cognis-Labs-HQ/Cognis/commit/024c4b6996da3c2f45a66ff876480140e245a3be)
