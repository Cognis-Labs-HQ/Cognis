# Zuverlässiger MariaDB-Start

## MariaDB wird abgewartet

Cognis wiederholt jetzt vorübergehende MariaDB-Verbindungsfehler innerhalb eines begrenzten Startzeitfensters, statt Migrationen während der Datenbankinitialisierung abzubrechen. Die Bereitstellung folgt der neuesten stabilen MariaDB-Container-Version, während die Zustandsprüfung MariaDB eine längere Initialisierungszeit gewährt. Neue Container erzeugen immer ein zufälliges Root-Passwort und aktualisieren die Datenbank-Systemtabellen automatisch; Bereitstellungen akzeptieren kein benutzerdefiniertes Root-Passwort mehr.
