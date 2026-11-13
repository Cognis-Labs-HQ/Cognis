# Datenbank-Typverträge

**Feature-Zweig:** feature-database-type-contracts

## Typisierte Datenbankgrenzen

Die Datenbankinitialisierung benötigt nur die verwendete direkte Ausführungsfunktion. Öffentliche Anwendungsexecutoren behalten strukturierte Befehle; Adaptertransaktionen behalten ihren direkten Executortyp. Spaltendeklarationen enthalten die bestehende optionale Umbenennungsquelle. PostgreSQL meldet null Zeilen, wenn der Treiber keine Zeilenanzahl liefert; Datensätze und numerische Anzahlen bleiben erhalten. MariaDB grenzt Befehlsvarianten vor der Normalisierung von Bedingungen ein. Adaptertests behalten generische Abfragesignaturen und verwenden eigene Datensätze.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/6b35ffb159afbea717ce9bd656629055f34ebaef
