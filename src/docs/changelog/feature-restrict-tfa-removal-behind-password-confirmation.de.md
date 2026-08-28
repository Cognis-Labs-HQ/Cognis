# TFA-Entfernung bestätigen

**Feature Branch:** feature-restrict-tfa-removal-behind-password-confirmation

## Passwort schützt die TFA-Entfernung

Beim Entfernen einer aktivierten Zwei-Faktor-Authentifizierungsmethode vom aktuellen Konto wird nun vor dem Anwenden der Einstellungsänderung die vorhandene Passwortabfrage verwendet. Wird die Abfrage abgebrochen, bleiben die ausstehenden Sicherheitseinstellungen unverändert.

## SMTP-Einrichtung erklärt E-Mail-Anforderungen

Die SMTP-Zwei-Faktor-Einrichtung zeigt jetzt eine Warnung an, dass eine bestätigte primäre E-Mail-Adresse erforderlich ist, anstatt einen allgemeinen Einrichtungsfehler anzuzeigen.

## Commits

- [f524f2f](https://github.com/Cognis-Labs-HQ/Cognis/commit/f524f2f62820dbbf6ff80366a835aca0f31d3359)
