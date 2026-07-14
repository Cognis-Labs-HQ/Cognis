# Whiteboard-Sync-Fix

## Element-Speicherung bleibt synchron

Whiteboard-Snapshot-Speicherungen verwenden jetzt das strukturierte Datenbank-Update-Feld beim Aktualisieren von Board-Zeitstempeln und verhindern 400-Antworten nach Canvas-Änderungen.

## Routentests spiegeln Updates

Die Whiteboard-Routentests nutzen jetzt strukturierte Update-Payloads, damit künftige Persistenzregressionen dem Produktionsdatenbankverhalten entsprechen.
