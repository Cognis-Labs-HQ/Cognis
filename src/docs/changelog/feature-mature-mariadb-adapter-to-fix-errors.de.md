# Zuverlässiger MariaDB-Start

## MariaDB wird abgewartet

Cognis wiederholt jetzt vorübergehende MariaDB-Verbindungsfehler innerhalb eines begrenzten Startzeitfensters, statt Migrationen während der Datenbankinitialisierung abzubrechen. Die Bereitstellungsprüfung gewährt MariaDB außerdem eine längere Initialisierungszeit. Neue Container erzeugen immer ein zufälliges Root-Passwort und aktualisieren die Datenbank-Systemtabellen automatisch; Bereitstellungen akzeptieren kein benutzerdefiniertes Root-Passwort mehr.
