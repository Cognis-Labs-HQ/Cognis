# LINE Messenger SSO-Adapter

## Überblick

Dieser Adapter aktiviert LINE Login für die Cognis-Authentifizierung.

Er unterstützt den Authorization-Code-Flow mit PKCE, damit mobile Nutzer mit
installierter LINE-App den Login per App-Übergabe abschließen und zur
konfigurierten Redirect-URI zurückkehren können.

## Unterstützter Lebenszyklus

- Erstmalige Kontoerstellung aus der LINE-Identität beim ersten erfolgreichen Login.
- Live-Synchronisierung von Anzeigename und Profilbild-URL-Metadaten beim Login.
- Übernahme der Zustände `active`, `unlinked`, `deactivated` und `deleted`.

## Erforderliche Konfiguration

- `channelId`
- `redirectUri`

Optional:

- `channelSecret`
- `usePkce`
- `accountIdPrefix`
- `tokenEndpoint`
- `profileEndpoint`
- `verifyIdTokenEndpoint`

## Hinweise für mobile Implementierung

Für mobile Web-/Native-Flows nutze das offizielle LINE-Verfahren mit
Authorization Code + PKCE und sende `authorizationCode` (und `codeVerifier`,
wenn PKCE verwendet wird) an `/api/v1/auth/login` mit `provider: "line"`.

Referenzen:

- https://developers.line.biz/en/docs/line-login/integrate-line-login/
- https://developers.line.biz/en/reference/line-login/#get-profile
- https://developers.line.biz/en/reference/line-login/#revoke-access-token
