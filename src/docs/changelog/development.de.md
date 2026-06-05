# Entkoppelte Gateway-APIs

## Standardisierte Gateway-Präfixe

Jedes Gateway besitzt seine API-Routen jetzt unter einem eigenen Präfix `/api/v1/<gateway-id>/`. Routen, die dieser Konvention nicht entsprachen, wurden umbenannt: Die Notify-Gateway-Routen wurden von `/api/v1/notifications/` nach `/api/v1/notify/` verschoben, und Social-Gateway-Routen wurden von `/api/v1/profile/`, `/api/v1/messages/` usw. nach `/api/v1/social/` verschoben.

## Deaktivierte Gateways blockieren ihr Präfix vollständig

Wenn ein Gateway deaktiviert ist, liefert jetzt jede HTTP-Anfrage unter seinem Präfix eine 503-Antwort mit `gateway_disabled`, statt auf einen 404-Fallthrough zu treffen.

## Deaktivierte Module liefern module_disabled

Wenn ein Modul deaktiviert ist, liefern Anfragen an seine registrierten Routen jetzt eine 503-Antwort mit `module_disabled`, statt auf 404 durchzufallen.
