# Datenbank-Typverträge

**Feature-Zweig:** feature-database-type-contracts

## Typisierte Datenbankgrenzen

Die Datenbankinitialisierung benötigt nur die verwendete direkte Ausführungsfunktion. Öffentliche Anwendungsexecutoren behalten strukturierte Befehle; Adaptertransaktionen behalten ihren direkten Executortyp. Spaltendeklarationen enthalten die bestehende optionale Umbenennungsquelle. PostgreSQL meldet null Zeilen, wenn der Treiber keine Zeilenanzahl liefert; Datensätze und numerische Anzahlen bleiben erhalten. MariaDB grenzt Befehlsvarianten vor der Normalisierung von Bedingungen ein. Adaptertests behalten generische Abfragesignaturen und verwenden eigene Datensätze.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/54d8066a0d9bdbe38d6b4baa0d79c67e49cc56dc
