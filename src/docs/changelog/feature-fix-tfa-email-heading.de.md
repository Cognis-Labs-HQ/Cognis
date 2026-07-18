# SMTP-TFA-E-Mail-Koordination

## TFA-E-Mail-Codes verwenden einen neutralen Betreff

SMTP-Nachrichten, die nur einen Code für die Zwei-Faktor-Authentifizierung enthalten, verwenden jetzt einen neutralen Verifizierungscode-Betreff statt der Überschrift zur E-Mail-Adressverifizierung. E-Mail-Adressverifizierungen mit Verifizierungslink behalten den bisherigen Betreff zur E-Mail-Verifizierung.

## E-Mail-Verifizierung folgt der SMTP-TFA-Codelänge

Codes zur Bestätigung von E-Mail-Adressen verwenden jetzt die gemeinsame SMTP-Adapter-Einstellung für die Codelänge, sodass Administratoren die Länge der SMTP-Verifizierungscodes entweder im SMTP-Benachrichtigungsadapter oder im SMTP-TFA-Adapter steuern können. Der SMTP-Benachrichtigungssender und der SMTP-TFA-Adapter synchronisieren außerdem ihren Aktivierungsstatus in beide Richtungen, und SMTP-TFA bleibt inaktiv, wenn der SMTP-Benachrichtigungsadapter nicht verfügbar ist.
