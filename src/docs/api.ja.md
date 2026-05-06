# API

## Überblick

`src/api/` ist die HTTP-Schicht von Cognis. Sie hostet den Express-kompatiblen Node.js-Server, die Route-Registry, die Authentifizierungs-Middleware und alle schlanken Route-Handler-Module, die eingehende HTTP-Anfragen auf Gateway-Operationen abbilden. Die API-Schicht ist absichtlich dünn gehalten: Route-Handler parsen und validieren Eingaben, delegieren an Gateways und geben einen stabilen Antwort-Envelope zurück.

Der Server wird aus dem zusammengestellt, was beim Start vorhanden ist, nicht aus einer fest codierten Komponentenliste. Gateways registrieren ihre eigenen Routen während des Bootstraps über `ctx.routeRegistry.register(...)`.

## Verantwortlichkeiten

- Den HTTP-Server hosten und die Route-Registry in die Anforderungsbehandlung einbinden.
- `requireAuth`- und `getAuthClaims`-Middleware für alle geschützten Route-Handler bereitstellen.
- Die `{ data }` / `{ error }` Antwort-Envelope-Konvention durchsetzen.
- Alle Gateways in Abhängigkeitsreihenfolge bootstrappen.
- Das Datenbankschema beim Start initialisieren.

## Architektur

### Antwort-Envelope

Alle API-Antworten verwenden eine dieser zwei Formen:

```json
{ "data": { ... } }
```

```json
{ "error": { "code": "forbidden", "message": "Erfordert Admin-Scope" } }
```

### Auth-Modell

Token über `POST /api/v1/auth/login` erhalten. Das Token als `Authorization: Bearer <token>` senden. Token-Ablauf wird durch `COGNIS_ACCESS_TOKEN_TTL_SECONDS` gesteuert (Standard: `43200`, zwölf Stunden).

### Wichtige Quellen

| Pfad | Zweck |
| ---- | ----- |
| `src/api/main.ts` | Server-Einstiegspunkt |
| `src/api/server.ts` | HTTP-Server-Setup und Route-Dispatch |
| `src/api/route-registry.ts` | Route-Registry für Gateway-Selbstregistrierung |
| `src/api/gateway-bootstrap.ts` | Alle Gateways laden und bootstrappen |
| `src/api/auth/guard.ts` | `requireAuth`, `getAuthClaims`-Middleware |

## Konfiguration

| Variable | Standard | Beschreibung |
| -------- | -------- | ------------ |
| `DB_TYPE` | `sqlite` | Datenbank-Backend |
| `DATABASE_URL` | — | Verbindungszeichenkette für PostgreSQL oder MariaDB |
| `SQLITE_PATH` | `./data/cognis.sqlite` | SQLite-Dateipfad |
| `COGNIS_ACCESS_TOKEN_TTL_SECONDS` | `43200` | Bearer-Token-Lebensdauer in Sekunden |
| `PORT` | `3000` | HTTP-Port |
