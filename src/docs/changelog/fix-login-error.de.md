# Fehlerhafte Login-Anfragen beheben

## Zusammenfassung

Login-Anfragen schlugen mit einer generischen Antwort `400 Request failed`
fehl, wenn der Social-Profile-Adapter nicht installiert war oder seine Tabelle
`account_profiles` nicht verfügbar war. Der DB-Store des lokalen Auth-Adapters
verknüpfte diese Tabelle bei der Anmeldeprüfung und Kontenauflistung, obwohl die
Authentifizierung nur von auth-eigenen Kontodaten abhängen darf.

Diese Änderung entfernt die adapterübergreifende Abhängigkeit zur Profiltabelle
aus dem lokalen Auth-Store, sodass der Login auch dann funktioniert, wenn nur
die Auth-Tabellen vorhanden sind. Zusätzlich wird ein Regressionstest ergänzt,
der fehlschlägt, falls Auth-Lookups doch `account_profiles` joinen.

## Geänderte Dateien / Komponenten

- `src/adapters/auth/local/store.ts` — `account_profiles`-Joins aus der lokalen
  Anmeldeprüfung und Kontenauflistung entfernt
- `src/adapters/auth/local/tests/store.test.ts` — Regressionstest für DB-basierte
  Authentifizierung ohne die Social-Profile-Tabelle ergänzt
- `src/adapters/auth/local/package.json` — Versionsnummer des Local-Auth-Adapters
  auf `0.2.3` erhöht
- `src/docs/versions.en.md` — Versionseintrag für den Local-Auth-Adapter
  aktualisiert

## Commit-Links

- https://github.com/le-firehawk/Cognis/commit/9ecb747f64a13830eb0d108fcd11d6bd5c0aa838
