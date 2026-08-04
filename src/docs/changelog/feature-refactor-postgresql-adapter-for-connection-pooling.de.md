# PostgreSQL-Verbindungspool

## PostgreSQL verwendet jetzt einen begrenzten Verbindungspool

Normale Datenbankoperationen können gleichzeitig über `pg.Pool` laufen, während jede Transaktion bis zum Commit oder Rollback an einen Client gebunden bleibt. Umgebungsvariablen begrenzen Poolgröße sowie Verbindungs-, Leerlauf- und optionale Anweisungszeitlimits.

## Beim Herunterfahren werden Datenbankverbindungen geleert

Der PostgreSQL-Adapter registriert das Schließen des Pools über die ctx-Lebenszyklusfähigkeit, damit der Server keine neuen Anfragen annimmt und den Pool sauber leert.
