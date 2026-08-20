# Zuständigkeit für Modulkonfiguration ausrichten

## Moduleigene Konfigurationsendpunkte verwenden

Cognis rendert nun die in Modulmanifesten deklarierten Felder und lädt sowie speichert Werte über den moduleigenen `GET`- und `PUT`-Konfigurationsendpunkt. Module bleiben für Validierung, Anwendung und Speicherung ihrer Betriebseinstellungen zuständig; Cognis führt keine parallele, einstellungsbasierte Konfiguration mehr.
