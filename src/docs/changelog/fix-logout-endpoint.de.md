# Fehlenden Logout-Endpunkt

**Feature Branch:** copilot/fix-logout-endpoint

## Zusammenfassung

Der Endpunkt `POST /api/v1/auth/logout` lieferte bei allen Anfragen eine
404-Antwort. Der Logout-Handler existierte nur in der veralteten Datei
`routes/index.ts` (`createAuthRoutes`), die niemals registriert wurde. Der
aktive Route-Handler, `createAuthGatewayRoutes` in `bootstrap.ts`, enthielt
keinen Logout-Fall.

Die Korrektur fügt den Logout-Endpunkt direkt zu `createAuthGatewayRoutes`
hinzu. Beim Abmelden wird das Cookie-Token sowie ein im
`Authorization`-Header übermitteltes Bearer-Token widerrufen, das Cookie
`cognis_access_token` geleert und der Vorgang auf `info`-Ebene protokolliert.

Der Dashboard-Logout-Ablauf sendet jetzt `POST /api/v1/auth/logout` vor dem
lokalen Token-Cleanup und übermittelt bei vorhandenem lokalem Token ein
Bearer-Token, damit aktive Tokens im normalen Benutzerpfad serverseitig
zuverlässig widerrufen werden.

## Geänderte Dateien / Komponenten

- `src/gateways/auth/bootstrap.ts` — Route `POST /api/v1/auth/logout` zu
  `createAuthGatewayRoutes` hinzugefügt; `revokeAccessToken` aus
  `access-tokens.js` importiert
- `src/api/reuse/access-token-http.ts` — gemeinsame Hilfsfunktionen für
  Secure-Cookie-Erkennung, Access-Token-Cookie-Erzeugung, Cookie-Token-Extraktion
  und Bearer-Token-Extraktion für Auth-Routen
- `src/ui/layouts/dashboard-layout.js` — Logout-Anfrage wird vor dem lokalen
  Token-Löschen gesendet; `Authorization: Bearer ...` wird bei vorhandenem
  lokalem Token angehängt
- `src/ui/tests/dashboard-layout-menu.test.js` — Regressionstest für die
  Reihenfolge der Logout-Anfrage und das Bearer-Header-Verhalten ergänzt

## Commit-Links

- [79bc1e7](https://github.com/Cognis-Labs-HQ/Cognis/commit/79bc1e7242a82f3f6a3b15c0210cdf32ef752893)
