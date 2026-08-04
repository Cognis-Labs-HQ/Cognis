# PostgreSQL-Verbindungspool

## PostgreSQL verwendet jetzt einen begrenzten Verbindungspool

Normale Datenbankoperationen können gleichzeitig über `pg.Pool` laufen, während jede Transaktion bis zum Commit oder Rollback an einen Client gebunden bleibt. Umgebungsvariablen begrenzen Poolgröße sowie Verbindungs-, Leerlauf- und optionale Anweisungszeitlimits.

## Beim Herunterfahren werden Datenbankverbindungen geleert

Der PostgreSQL-Adapter registriert das Schließen des Pools über die ctx-Lebenszyklusfähigkeit, damit der Server keine neuen Anfragen annimmt und den Pool sauber leert.

## Docker-Einrichtungen verwenden jetzt eindeutige Umgebungsprofile

Gemeinsame, PostgreSQL-, Entwicklungs- und Produktions-Env-Dateien enthalten nun die Container-Standardwerte. Compose wählt die passenden Profile ohne Interpolation nicht gesetzter Poolvariablen aus und beseitigt dadurch Warnungen über leere Variablen.

## MariaDB verwendet jetzt gleichwertiges Connection-Pooling

Der MariaDB-Adapter verwendet nun einen begrenzten `mysql2`-Pool für gleichzeitige Abfragen, bindet Transaktionen an eine Verbindung, leert den Pool beim Herunterfahren und unterstützt begrenzte Einstellungen für Maximalgröße, Leerlauf- und Verbindungszeitlimit.
