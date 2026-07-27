# Namen für Kalenderfeeds

## Benannte ICS-Ressourcen

ICS-Varianten enden nun mit dem kodierten aktuellen Kalendernamen und `.ics`. Ältere Adressen, die nur ein Token enthalten, leiten nach der Authentifizierung zur benannten Ressource weiter, damit Import-Clients den richtigen Kalendernamen ableiten.

## Erzwungener Schreibschutz

Schreibgeschützte ICS- und CalDAV-Freigaben lehnen jede verändernde WebDAV-Methode mit `403` und einer `DAV:need-privileges`-Antwort ab. Beschreibbare CalDAV-Freigaben akzeptieren weiterhin unterstützte Terminänderungen.
