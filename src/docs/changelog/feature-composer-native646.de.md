# Native Layout-Aktionen

**Feature-Zweig:** feature-composer-native646

## Native Layout-Aktionen

Die Haupt- und verschachtelten Layout-Panels verwenden native Steuerelemente vom Typ `button type="button"` für Fertig, Verwerfen und Zurücksetzen. Diese Aktionen senden kein umgebendes Formular ab und lösen keine Navigation aus. Laufende Layout-Speicherungen deaktivieren sie über die bestehende Editorsperre; fehlgeschlagene Speicherungen geben sie für einen ausdrücklichen neuen Versuch wieder frei. Fertig speichert weiterhin und schließt nach Bestätigung, Verwerfen stellt den lokalen Ausgangszustand ohne Schreibzugriff wieder her, und Zurücksetzen speichert das Standardlayout bei fortgesetzter Bearbeitung. Bestehende Aktionsklassen und das Ziel `#composer-edit-toggle` der Arbeitsbereichsanleitung bleiben unverändert.

## Commits

- [481b70cc45f310e2086d1a7fe8765cf25c2c7877](https://github.com/Cognis-Labs-HQ/Cognis/commit/481b70cc45f310e2086d1a7fe8765cf25c2c7877)
