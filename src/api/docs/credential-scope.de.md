# Begrenzte Routenfreigabe

Kontoprüfungen akzeptieren nur Sitzungsanmeldungen. Eine gemischte Ressourcenroute ruft ausdrücklich `share:getGuestClaims(request)` ab und prüft anschließend Ressourcen- und Aktionsberechtigungen. Fehlende oder ungültige Gastanmeldungen erlauben nur eine normale Kontoauthentifizierung, niemals Kontoberechtigungen mit Gastdaten. Eine Modulroute mit vollständiger Prüfung im Handler lässt äußere Kontorollen-Metadaten weg; Verwaltungsrouten behalten sie. Nur Provider- und App-Routenerkennung akzeptieren aktive Gastanmeldungen zur Darstellung, mit den bestehenden Rollenfiltern. Der nicht zwischengespeicherte Identitätsendpunkt gibt nur bestätigtes Subjekt, Rolle, Provider, Zweck und Einrichtungsstatus zurück.

## Verwendung

`await ctx.getCapability("share:getGuestClaims")(request)`

## Vertrag

`Promise<{ sub: string; role: "user"; providerId: string; purpose: "share"; setupPending: false } | null>`
