# PostgreSQL-Schlüssel

**Feature-Zweig:** fix-postgres-unique-reconciliation

## Eindeutige Schlüssel

PostgreSQL gleicht mit `ensureTable()` die Deklarationen `unique: true` und zusammengesetzte `uniqueKeys` sowohl für vorhandene als auch für neue Tabellen ab. Gültige, sofort wirksame, nicht partielle eindeutige Indizes werden anhand ihrer Schlüsselspalten erkannt; nur fehlende Indizes werden erstellt. Mehrere NULL-Werte bleiben erlaubt. Bestehende Primärschlüssel werden nicht ersetzt.

Die Schemainitialisierung läuft in einer Transaktion mit einer Advisory-Sperre pro Tabelle, auch innerhalb einer bestehenden Executor-Transaktion. Doppelte Werte oder kollidierende Indexnamen führen zum Abbruch und zum Zurückrollen der Schemaänderungen. Datensätze werden weder gelöscht noch neu zugeordnet. Fehler werden an der Transaktionsgrenze protokolliert.

## Commits

- [74a33d3](https://github.com/Cognis-Labs-HQ/Cognis/commit/74a33d36a60b53bb8258d827e484ab39651a27ed)
