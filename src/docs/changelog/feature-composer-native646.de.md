# Native Layout-Aktionen

**Feature-Zweig:** feature-composer-native646

## Native Layout-Aktionen

Die Haupt- und verschachtelten Layout-Panels verwenden native Steuerelemente vom Typ `button type="button"` für Fertig, Verwerfen und Zurücksetzen. Diese Aktionen senden kein umgebendes Formular ab und lösen keine Navigation aus. Laufende Layout-Speicherungen deaktivieren sie über die bestehende Editorsperre; fehlgeschlagene Speicherungen geben sie für einen ausdrücklichen neuen Versuch wieder frei. Fertig speichert weiterhin und schließt nach Bestätigung, Verwerfen stellt den lokalen Ausgangszustand ohne Schreibzugriff wieder her, und Zurücksetzen speichert das Standardlayout bei fortgesetzter Bearbeitung. Bestehende Aktionsklassen und das Ziel `#composer-edit-toggle` der Arbeitsbereichsanleitung bleiben unverändert.

## Commits

- [eadda4b8f2ffdd8cdb9da3fc4205b3fb09524529](https://github.com/Cognis-Labs-HQ/Cognis/commit/eadda4b8f2ffdd8cdb9da3fc4205b3fb09524529)
- [9dc32536b63fe4a385001b74b52c8bc0a725784e](https://github.com/Cognis-Labs-HQ/Cognis/commit/9dc32536b63fe4a385001b74b52c8bc0a725784e)
