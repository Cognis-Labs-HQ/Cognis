# Sicherheit bei Freigaben

## Authentifizierung bleibt erforderlich

Passwortgeschützte ICS- und CalDAV-Adressen enthalten keine abgeleiteten Zugangsdaten mehr. Kalender-Clients müssen sich mit dem festgelegten Freigabepasswort anmelden, bevor Kalenderdaten übertragen werden.

## Standardbasierte Berechtigungen

Die CalDAV-Erkennung veröffentlicht nun die in RFCs definierten aktuellen Benutzerrechte und den unterstützten VEVENT-Komponentensatz. ICS-WebDAV-Abfragen melden schreibgeschützte Rechte, da Abonnementfeeds keine Schreibzugriffe unterstützen.

## Kalendername in der Adresse

CalDAV-Varianten enthalten den kodierten Kalendernamen, sodass Clients einen verständlichen Namen aus der Sammlungsadresse ableiten können, ohne Anmeldedaten offenzulegen.
