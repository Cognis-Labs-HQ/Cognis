# Anwendung

Praktische Abläufe für Arbeitsspeicher-Datenbank.

## Voraussetzungen

Dieser Testersatz bietet weder Persistenz noch Transaktions-Rollback.

## Beispiele

Erzeuge MemoryDatabaseGateway, rufe query oder execute auf und prüfe statement und params über getQueries().

## Erwartete Ergebnisse

query liefert leere rows und rowCount null; execute liefert affectedRows null.

## Fehlerbehebung

DB_TYPE allein wählt diese Klasse nicht im Standardloader; Persistenztests brauchen eine echte Datenbank.
