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

## Geänderte Dateien/Komponenten

- `src/gateways/notify/gateway.ts`
- `src/gateways/notify/bootstrap.ts`
- `src/gateways/tfa/bootstrap.ts`
- `src/adapters/notify/smtp/smtp-notification-sender.ts`
- `src/adapters/tfa/smtp/index.ts`
- `src/gateways/notify/tests/notification-gateway.test.ts`
- `src/adapters/notify/smtp/tests/smtp-notification-sender.test.ts`
- `src/adapters/tfa/smtp/tests/smtp-adapter.test.ts`
