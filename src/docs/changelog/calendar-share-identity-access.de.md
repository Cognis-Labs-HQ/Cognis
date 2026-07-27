# Kalendername und Zugriff

## Aktuelle Kalendernamen

Kalender-Client-Adressen beziehen ihren Sammlungsnamen nun aus dem aktuellen Datensatz des Calendar-Gateways. Freigabemetadaten werden nur verwendet, wenn die aktuelle Ressource nicht verfügbar ist.

## Schreibgeschützte Benutzerfreigaben

Der Adapter für Benutzerfreigaben entfernt Schreibrechte, sobald die Berechtigung Lesen ausgewählt ist. Die CalDAV-Erkennung meldet dadurch nur Leserechte und Kalender-Clients deaktivieren die Bearbeitung.
