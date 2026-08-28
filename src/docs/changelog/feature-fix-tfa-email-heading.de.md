# SMTP-TFA-E-Mail-Koordination

**Feature Branch:** feature-fix-tfa-email-heading

## TFA-E-Mail-Codes verwenden einen neutralen Betreff

SMTP-Nachrichten, die nur einen Code für die Zwei-Faktor-Authentifizierung enthalten, verwenden jetzt einen neutralen Verifizierungscode-Betreff statt der Überschrift zur E-Mail-Adressverifizierung. E-Mail-Adressverifizierungen mit Verifizierungslink behalten den bisherigen Betreff zur E-Mail-Verifizierung.

## E-Mail-Verifizierung folgt der SMTP-TFA-Codelänge

Codes zur Bestätigung von E-Mail-Adressen verwenden jetzt die gemeinsame SMTP-Adapter-Einstellung für die Codelänge, sodass Administratoren die Länge der SMTP-Verifizierungscodes entweder im SMTP-Benachrichtigungsadapter oder im SMTP-TFA-Adapter steuern können. Das Aktivieren von SMTP-TFA aktiviert bei Bedarf den SMTP-Benachrichtigungssender, während SMTP-TFA weiterhin unabhängig deaktivierbar bleibt und nicht verfügbar ist, wenn der SMTP-Benachrichtigungsadapter keine E-Mails senden kann.

## Commits

- [d164f42](https://github.com/Cognis-Labs-HQ/Cognis/commit/d164f428bb4f843efe7a875c172855182e7a4548)
