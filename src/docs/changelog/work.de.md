# Whiteboard-Freigabe-Fix

## Share-Adapter lädt wieder

Die Whiteboard-Freigabeschaltfläche importiert ihren Adapter jetzt aus dem statischen Modulstamm, sodass das Popup ohne 404 geöffnet werden kann.

## Regressionsabdeckung

Ein UI-Quelltest prüft jetzt, dass der Share-Adapter den bereitgestellten statischen Pfad statt eines nicht vorhandenen app-Unterordners verwendet.
