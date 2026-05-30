# SMTP TFA: Resend & Ratenlimit

## Zusammenfassung

Der Link „E-Mail-Code erneut senden" im SMTP-Zwei-Faktor-Bildschirm erscheint
jetzt in einer eigenen Zeile direkt unterhalb des Code-Eingabefelds statt
inline im Aktionsbereich.

Der Countdown zum SMTP-Ratenlimit wird nun korrekt wiederhergestellt und
beginnt, sobald der ratenbegrenzte Zustand erkannt wird – ob beim ersten
Anmeldeversuch oder nach einem fehlgeschlagenen Erneut-Senden.

SMTP-basierte Login-Challenges wechseln jetzt sofort in die TFA-Abfrage, sobald
die Bestätigungs-E-Mail in die Versandwarteschlange gestellt wurde, statt auf
den Abschluss der SMTP-Zustellung zu warten. Befindet sich die Warteschlange
noch im Empfänger-Ratenlimit, erhält die Login-Oberfläche den Countdown
unmittelbar und lässt den zuletzt gültigen Code aktiv, bis der Versand erfolgen
kann.

Der TFA-Bildschirm bleibt jetzt erhalten, wenn der Browser-Viewport zwischen
Mobil- und Desktop-Layout wechselt. Zuvor wurde die Seite beim Ändern der
Fenstergröße während des TFA-Schritts auf den Anmeldebildschirm zurückgesetzt.
Der aktive TFA-Dialog wird nach jedem Layout-Re-Render automatisch
wiederhergestellt.

Wenn der SMTP-Login-Ablauf einen Code automatisch versendet, bestätigt der
Toast jetzt den Versand, statt vor dem Erneut-Sende-Countdown zu warnen. Der
Link zum erneuten Senden zeigt den Countdown weiterhin an, damit das aktuelle
Ratenlimit klar bleibt.

SMTP-Codes werden nicht mehr beim Laden der Seite gesendet, wenn mehrere
TFA-Methoden verfügbar sind. Der Server initiiert eine Challenge jetzt nur noch,
wenn der Nutzer genau eine konfigurierte Methode hat. Bei mehreren Methoden
wird keine Challenge gestartet, bis der Nutzer explizit einen Methoden-Tab
auswählt – erst dann löst der Client über den Resend-Endpunkt eine Challenge
aus. Beim erneuten Wechsel zum SMTP-Tab wird der Code nicht erneut gesendet,
solange die bestehende Challenge noch aktiv ist.

## Geänderte Dateien/Komponenten

- `src/gateways/notify/gateway.ts`
- `src/gateways/notify/bootstrap.ts`
- `src/gateways/tfa/bootstrap.ts`
- `src/gateways/tfa/gateway.ts`
- `src/gateways/tfa/ui/login-flow.js`
- `src/gateways/tfa/ui/languages/*/strings.xml`
- `src/gateways/tfa/tests/login-flow-ui.test.js`
- `src/gateways/tfa/tests/tfa-gateway.test.ts`
- `src/gateways/tfa/manifest.json`
- `src/adapters/notify/smtp/smtp-notification-sender.ts`
- `src/adapters/tfa/smtp/index.ts`
- `src/gateways/notify/tests/notification-gateway.test.ts`
- `src/adapters/notify/smtp/tests/smtp-notification-sender.test.ts`
- `src/adapters/tfa/smtp/tests/smtp-adapter.test.ts`
- `src/docs/versions.en.md`
