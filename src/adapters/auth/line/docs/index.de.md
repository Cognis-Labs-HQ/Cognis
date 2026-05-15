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
- Fallback über das Registration-Gateway bei deaktivierter öffentlicher
  Registrierung: Es wird eine ausstehende Registrierungsanfrage für die
  Admin-Freigabe erstellt, bevor das Konto nutzbar ist.

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

## LINE-Console-Einrichtung (Kanal + Callback-URL)

1. Erstelle im LINE Developers Console einen **LINE Login**-Kanal und verknüpfe
   ihn mit deinem Provider.
2. Öffne die **LINE Login**-Einstellungen dieses Kanals und aktiviere
   **Use LINE Login in your web app**.
3. Trage als **Callback URL** den Cognis-Redirect-Endpunkt für diese Umgebung
   (Produktion/Staging/Lokal) ein und speichere.
4. Übertrage die Kanalwerte nach Cognis:
   - `channelId` = LINE **Channel ID**
   - `channelSecret` = LINE **Channel secret** (optional bei reinem PKCE-Flow)
   - `redirectUri` = exakt dieselbe URL wie bei LINE **Callback URL**
5. In Cognis unter Administration → Authentication → LINE Messenger SSO →
   Configure kannst du die von Cognis verwaltete Callback-URL aus dem Popup
   übernehmen und als `redirectUri` speichern, sofern du keine andere öffentliche
   Callback-URL benötigst.

## Zu `redirectUri` (ist das generisch?)

`redirectUri` wird nicht von LINE bereitgestellt und ist kein globaler
Standardwert. Es ist die Callback-URL deiner eigenen Cognis-Instanz. Du legst
sie selbst fest und verwendest exakt denselben Wert an beiden Stellen:

- LINE Console: **Callback URL**
- Cognis-Adapterkonfiguration: `redirectUri`

Wenn sich beide Werte unterscheiden (inklusive Pfad, abschließendem Slash oder
Protokoll), schlägt der Authorization-Code-Austausch mit LINE fehl.

## Hinweis zur Nutzereinwilligung für LINE-E-Mail-Weitergabe

Bevor Nutzer mit LINE fortfahren, zeigt Cognis ein Warn-Popup zur Offenlegung
der E-Mail-Adresse, um die LINE-Anforderungen zu erfüllen.

## Hinweise für mobile Implementierung

Für mobile Web-/Native-Flows nutze das offizielle LINE-Verfahren mit
Authorization Code + PKCE und sende `authorizationCode` (und `codeVerifier`,
wenn PKCE verwendet wird) an `/api/v1/auth/login` mit `provider: "line"`.

Referenzen:

- https://developers.line.biz/en/docs/line-login/integrate-line-login/
- https://developers.line.biz/en/docs/line-login/getting-started/#channel-and-provider-linkage
- https://developers.line.biz/en/reference/line-login/#get-profile
- https://developers.line.biz/en/reference/line-login/#revoke-access-token
