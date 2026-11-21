# Native Layout-Aktionen

**Feature-Zweig:** feature-composer-native646

## Native Layout-Aktionen

Die Haupt- und verschachtelten Layout-Panels verwenden native Steuerelemente vom Typ `button type="button"` für Fertig, Verwerfen und Zurücksetzen. Diese Aktionen senden kein umgebendes Formular ab und lösen keine Navigation aus. Laufende Layout-Speicherungen deaktivieren sie über die bestehende Editorsperre; fehlgeschlagene Speicherungen geben sie für einen ausdrücklichen neuen Versuch wieder frei. Fertig speichert weiterhin und schließt nach Bestätigung, Verwerfen stellt den lokalen Ausgangszustand ohne Schreibzugriff wieder her, und Zurücksetzen speichert das Standardlayout bei fortgesetzter Bearbeitung. Bestehende Aktionsklassen und das Ziel `#composer-edit-toggle` der Arbeitsbereichsanleitung bleiben unverändert.

## Commits

- [d458e6e3dd3e08a30fcd43be1c73b3e0eccc1dcc](https://github.com/Cognis-Labs-HQ/Cognis/commit/d458e6e3dd3e08a30fcd43be1c73b3e0eccc1dcc)
- [ab5b5e5a20216143ca0dc99d8b4ecd0bc45afef0](https://github.com/Cognis-Labs-HQ/Cognis/commit/ab5b5e5a20216143ca0dc99d8b4ecd0bc45afef0)
- [2d77508cffcb4eb46900f76d4f4174dba1799f7c](https://github.com/Cognis-Labs-HQ/Cognis/commit/2d77508cffcb4eb46900f76d4f4174dba1799f7c)
