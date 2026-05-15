# Fehlenden Logout-Endpunkt beheben

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

## Geänderte Dateien / Komponenten

- `src/gateways/auth/bootstrap.ts` — Route `POST /api/v1/auth/logout` zu
  `createAuthGatewayRoutes` hinzugefügt; `revokeAccessToken` aus
  `access-tokens.js` importiert

## Commit-Links

- https://github.com/le-firehawk/Cognis/commit/79bc1e7242a82f3f6a3b15c0210cdf32ef752893
