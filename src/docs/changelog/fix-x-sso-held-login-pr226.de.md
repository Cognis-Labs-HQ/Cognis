# Rückrufnavigation

**Feature-Zweig:** fix-x-sso-held-login-pr226

## Autorisierung erhalten

Eigenständige Authentifizierungsrückrufe verwenden `navigateToDocument(path, { signal })` aus `page-entry.js` für Wechsel zu Serverdokumenten. Die Funktion prüft HTTP(S)-URLs desselben Ursprungs ohne eingebettete Zugangsdaten, beachtet den bestehenden Navigationsschutz und verhindert Navigation nach Abbruch. Dashboard-Navigation und das Verhalten bei fehlenden Renderern bleiben beim unveränderten SPA-Router. `ui:log` überspringt anonyme Anfragen und fängt Zustellfehler ab; der Protokollierungsendpunkt erfordert weiterhin Authentifizierung.

## Commits

- [72dfbc8](https://github.com/Cognis-Labs-HQ/Cognis/commit/72dfbc8c8f0b8b456ec5b59e5e2ad5e6652a2cad)
- [9a9387b](https://github.com/Cognis-Labs-HQ/Cognis/commit/9a9387b199dfa3208b83a51aa66d3820a915297a)
- [aad15f0](https://github.com/Cognis-Labs-HQ/Cognis/commit/aad15f0cca5eaa3e93ac08eec5e27f72d8b95163)
