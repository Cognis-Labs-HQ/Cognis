# SMTP TFA: Resend & Ratenlimit

## Zusammenfassung

Der Link „E-Mail-Code erneut senden" im SMTP-Zwei-Faktor-Bildschirm erscheint
jetzt in einer eigenen Zeile direkt unterhalb des Code-Eingabefelds statt
inline im Aktionsbereich.

Der Countdown zum SMTP-Ratenlimit wird nun korrekt wiederhergestellt und
beginnt, sobald der ratenbegrenzte Zustand erkannt wird – ob beim ersten
Anmeldeversuch oder nach einem fehlgeschlagenen Erneut-Senden.

Wenn der erste Anmeldeversuch ratenbegrenzt ist (d. h. keine Bestätigungs-E-Mail
versendet wurde), wird jetzt ein Warnhinweis angezeigt, der den Nutzer darüber
informiert, dass kürzlich ein Code gesendet wurde und wann ein neuer angefordert
werden kann.

Der TFA-Bildschirm bleibt jetzt erhalten, wenn der Browser-Viewport zwischen
Mobil- und Desktop-Layout wechselt. Zuvor wurde die Seite beim Ändern der
Fenstergröße während des TFA-Schritts auf den Anmeldebildschirm zurückgesetzt.
Der aktive TFA-Dialog wird nach jedem Layout-Re-Render automatisch
wiederhergestellt.

## Geänderte Dateien/Komponenten

- `src/gateways/tfa/ui/login-flow.js`
- `src/ui/app/login/index.js`
- `src/ui/styles/login.css`
- `src/gateways/tfa/ui/languages/*/strings.xml`
