# Adapter

## Überblick

`src/adapters/` enthält alle anbieterspezifischen Implementierungen von Gateway-Schnittstellen. Ein Adapter ist eine konkrete Klasse, die einen in `src/core/` oder einem Gateway definierten Vertrag implementiert. Das Austauschen eines Datenbank-Backends bedeutet das Ändern von `DB_TYPE` in der Umgebung; kein Anwendungscode außerhalb des Gateways ändert sich.

Jeder Adapter lebt unter `src/adapters/<gateway-id>/<adapter-id>/` und trägt seine eigene `package.json`, Tests und Dokumentation. Das besitzende Gateway entdeckt Adapter durch Scannen dieses Verzeichnisses beim Start.

## Verantwortlichkeiten

- Gateway-Schnittstellen für spezifische externe Anbieter implementieren.
- Anbieterspezifische Verbindungsdetails, SQL-Dialekte und Fehlerbehandlung intern verwalten.
- Eigene Schema-Initialisierungs-SQL tragen (für DB-Adapter).
- Eigene Tests, Dokumentation und Versionsmanifest tragen.

## Architektur

### Verzeichniskonvention

```
src/adapters/
  db/
    mariadb/     — MariaDB/MySQL
    postgres/    — PostgreSQL (Standard)
    memory/      — In-Memory (nur Tests)
  auth/
    local/       — Lokale Anmeldedaten mit scrypt-Hashing
    ldap/        — LDAP-Verzeichnis-Authentifizierung
    saml/        — SAML 2.0 SSO
    oidc/        — OAuth2/OIDC SSO
  notify/
    smtp/        — E-Mail-Zustellung via SMTP
  file/
    local/       — Dateisystem-basierter Dateispeicher
```

### Dateistruktur-Konventionen

Das `main`-Feld in `package.json` muss immer auf `index.ts` zeigen — das ist der orchestrierende Einstiegspunkt des Adapters und die Datei, die das Gateway dynamisch importiert:

```json
{
    "name": "@cognis/adapter-notify-smtp",
    "version": "0.2.1",
    "private": true,
    "type": "module",
    "main": "index.ts"
}
```

`index.ts` ist die öffentliche Oberfläche des Adapters und exportiert alles, was externe Aufrufer benötigen. Interne Implementierungsdateien leben als Geschwister von `index.ts` und werden nie direkt von außerhalb des Adapters importiert. Für komplexe Adapter, deren `index.ts` etwa 400 Zeilen überschreiten würde, gilt das gleiche Aufteilungsmuster wie für Gateways.

Um einen neuen Adapter für ein vorhandenes Gateway hinzuzufügen, ein Verzeichnis unter `src/adapters/<gateway-id>/<adapter-id>/` erstellen mit:

- Der Adapter-Implementierung (TypeScript-Klasse, die die Gateway-Schnittstelle implementiert).
- Einer `package.json` mit `name`, `version` und einem `main`-Feld.
- Einer exportierten `createAdapter()`-Funktion.
- Einer `docs/index.en.md` nach dem Dokumentationsstandard.
- Tests unter `tests/`.
