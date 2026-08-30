# MariaDB-Zeitwertreparatur

## Kontoregistrierung akzeptiert ISO-Zeitstempel

MariaDB erkennt nun vollständig qualifizierte Spaltennamen in Zeitwertfehlern und wiederholt Schreibvorgänge auf unstrukturierten Schemas mit kanonischen `DATETIME`-Werten. Dadurch beendet eine Kontoregistrierung nicht mehr die API-Laufzeit.
