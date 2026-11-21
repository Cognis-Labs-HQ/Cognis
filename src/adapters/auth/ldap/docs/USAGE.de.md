# Anwendung

Praktische Abläufe für LDAP-Anmeldung.

## Voraussetzungen

Halte LDAP-Adresse, Bind-Zugangsdaten, Suchbasis und Benutzerfilter für die Authentifizierungsverwaltung bereit.

## Beispiele

Speichere die LDAP-Einstellungen und teste die Verbindung. Behebe Bind- oder Suchfehler und prüfe die Anmeldung eines Verzeichnisbenutzers vor der Nutzung von Administratorgruppen.

## Erwartete Ergebnisse

Der Test meldet Verbindungs- und Suchstatus. Erfolgreiche Anmeldung verbindet die Verzeichnisidentität mit einem Cognis-Konto.

## Fehlerbehebung

Prüfe TLS-Vertrauen, Bind-Rechte, Suchbereich und Benutzerfilter. Ein Verbindungstest allein bestätigt weder ein bestimmtes Passwort noch die Gruppenzuordnung.
