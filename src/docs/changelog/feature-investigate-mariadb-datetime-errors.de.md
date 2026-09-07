# MariaDB-Zeitwertreparatur

**Feature-Zweig:** feature-investigate-mariadb-datetime-errors

## Kontoregistrierung akzeptiert ISO-Zeitstempel

MariaDB erkennt nun vollständig qualifizierte Spaltennamen in Zeitwertfehlern und wiederholt Schreibvorgänge auf unstrukturierten Schemas mit kanonischen `DATETIME`-Werten. Dadurch beendet eine Kontoregistrierung nicht mehr die API-Laufzeit.

## Zeitwertfehler werden sicher ausgewertet

MariaDB-Datumsfehler verwenden nun einen gezielten Ausdruck, um den letzten in Anführungszeichen gesetzten Spaltenbezeichner zu extrahieren. Die Unterstützung vollständig qualifizierter Spalten bleibt mit deutlich weniger Analyselogik erhalten.

## Änderungen

- [5f4972b](https://github.com/Cognis-Labs-HQ/Cognis/commit/5f4972b0a20caebb2e365204dd1c945e05ad0085)
- [5a95fce](https://github.com/Cognis-Labs-HQ/Cognis/commit/5a95fce9c4f66ef6b1f931fb03ec3f54b2e7c22a)
- [2d3d380](https://github.com/Cognis-Labs-HQ/Cognis/commit/2d3d3806)
- [ebc448f1](https://github.com/Cognis-Labs-HQ/Cognis/commit/ebc448f1)
