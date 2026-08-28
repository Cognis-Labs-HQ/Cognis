# TFA-Gateway-Fehlerbehebungen

**Feature Branch:** copilot/smtp-adapter-tfa-gateway

## Enable-Anfragen schlagen nicht mehr fehl; TOTP standardmäßig aktiviert; SMTP-TFA-Status folgt SMTP-Benachrichtigung

Enable-Anfragen im TFA-Gateway schlagen nicht mehr fehl, wenn ein Adapter nicht explizit in der Datenbank konfiguriert wurde. Der TOTP-Adapter ist bei Neuinstallationen nun standardmäßig aktiviert, da er keine externen Abhängigkeiten hat. Die Verfügbarkeit des SMTP-TFA-Adapters ist jetzt an den SMTP-Benachrichtigungsadapter gekoppelt: Ist kein SMTP-Versand konfiguriert, steht die SMTP-basierte Zwei-Faktor-Authentifizierung automatisch nicht zur Verfügung, und der Schalter ist in der Administration gesperrt. Das Aktivieren oder Deaktivieren eines TFA-Adapters überschreibt seine gespeicherte Konfiguration nicht mehr. Die Standard-Verifizierungscodelänge für den SMTP-TFA-Adapter beträgt sechs Stellen.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/93e0a59123d977c14b058e65dab3d9d42ebd011b
