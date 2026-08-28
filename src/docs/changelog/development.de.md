# Entkoppelte Gateway-APIs

**Feature Branch:** development

## Standardisierte Gateway-Präfixe

Jedes Gateway besitzt seine API-Routen jetzt unter einem eigenen Präfix `/api/v1/<gateway-id>/`. Routen, die dieser Konvention nicht entsprachen, wurden umbenannt: Die Notify-Gateway-Routen wurden von `/api/v1/notifications/` nach `/api/v1/notify/` verschoben, und Social-Gateway-Routen wurden von `/api/v1/profile/`, `/api/v1/messages/` usw. nach `/api/v1/social/` verschoben.

## Deaktivierte Gateways blockieren ihr Präfix vollständig

Wenn ein Gateway deaktiviert ist, liefert jetzt jede HTTP-Anfrage unter seinem Präfix eine 503-Antwort mit `gateway_disabled`, statt auf einen 404-Fallthrough zu treffen.

## Deaktivierte Module liefern module_disabled

Wenn ein Modul deaktiviert ist, liefern Anfragen an seine registrierten Routen jetzt eine 503-Antwort mit `module_disabled`, statt auf 404 durchzufallen.

# Logging-Testabdeckung und Behebung stiller Fehler

## Serverseitige Logging-Testabdeckung erweitert

Neue Testfälle prüfen, dass die Logging-Stream-Route bei nicht übereinstimmenden Pfaden und Nicht-GET-Methoden false zurückgibt, bei fehlendem Logfile ein `snapshot_error`-Ereignis sendet, Log-Rotation über eine Dateigrößenverkleinerung erkennt und ein `reset`-Ereignis ausgibt sowie Zeitbereichsfilter in Stunden korrekt anwendet. Drei weitere Logger-Unit-Tests prüfen die JSON-Konsolenausgabe, die korrekte Weiterleitung von `writeConsoleLog` an stdout bzw. stderr und die Auslassung des Meta-Felds bei `createLogEntry` ohne sinnvolle Werte.

## Stille catch-Blöcke in Crash-Popup und Router beseitigt

Die zwei `catch(() => {})` in `installRuntimeErrorHandlers` protokollieren jetzt eine Warnung, statt Fehler beim Öffnen des Popups zu schlucken. Der catch-Block in `readAuthSetupRequirement` im App-Router protokolliert jetzt den Netzwerkfehler. Der per-Sprache-Fetch-catch in `loadStudyChildComponents` protokolliert jetzt Sprachcode und Fehler vor dem Fallback. Der `startStream`-catch im Admin-Logs-Bereich protokolliert jetzt den Verbindungsfehler, und der fehlerhafte SSE-Ereignis-catch gibt Parse-Fehler aus, statt sie still zu verwerfen.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/c2dd07a630b453a51f9793ab2855ab96150b058c
