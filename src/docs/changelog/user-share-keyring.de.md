# Benachrichtigungen und sicheres Entsperren für Benutzerfreigaben

## Benutzerfreigaben benachrichtigen Empfänger

Beim Freigeben eines Elements für Cognis-Benutzer wird nun eine Benachrichtigung der Kategorie „Freigabe“ gemäß den Benachrichtigungseinstellungen jedes Empfängers gesendet. Die Benachrichtigung öffnet das freigegebene Element direkt.

## Passwörter bleiben im Schlüsselbund verschlüsselt

Passwortgeschützte Benutzerfreigaben fordern Empfänger einmalig zum Entsperren auf und speichern das bestätigte Passwort in einem Browser-Schlüsselbund, der mit dem Anmeldepasswort verschlüsselt wird. Komponenten greifen über benannte Schlüsselbund-Fähigkeiten statt über Klartextspeicher auf Einträge zu.

## Erneutes Sperren ist konfigurierbar

In den Sicherheitseinstellungen kann der Schlüsselbund bis zur Abmeldung geöffnet bleiben oder nach einer gewählten Zeit automatisch gesperrt werden. Lese- und Schreibrechte steuern weiterhin die freigegebenen Komponentendaten.
