# Whiteboard-Speicherfixes

## Snapshot-Speichern repariert

Whiteboard-Element-Snapshots verwenden jetzt das strukturierte Datenbank-Konfliktformat, sodass wiederholte Speicherungen den bestehenden Snapshot aktualisieren statt mit doppelten Schlüsseln zu scheitern.

## Freigabe stabilisiert

Die Share-Flow-Registrierung bleibt im Systemkontext, während Persistenztests wiederholte Sitzungswiederherstellungen und Snapshot-Speicherungen abdecken.
