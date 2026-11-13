# SMTP-Auth-Einstellungen

**Feature-Zweig:** feature-require-username-and-password-for-smtp

## SMTP-Zugangsdaten erforderlich, sofern Authentifizierung nicht deaktiviert ist

Die Einstellungen des SMTP-Benachrichtigungsadapters behandeln Benutzername und Passwort jetzt als Pflichtfelder, wenn Authentifizierung deaktivieren ausgeschaltet ist. Dadurch werden unvollständige authentifizierte SMTP-Konfigurationen in der Administration verhindert.

## Pflichtfelder im Formular kennzeichnen

Titel von Pflichtfeldern zeigen jetzt im hellen und dunklen Modus ein Sternchen. Die Kennzeichnungen werden sofort aktualisiert, wenn Formularänderungen beeinflussen, welche SMTP-Felder erforderlich sind.

## Änderungen

- [8983ae1](https://github.com/Cognis-Labs-HQ/Cognis/commit/8983ae1fe74eac032b99e894abf857606af7260c)
