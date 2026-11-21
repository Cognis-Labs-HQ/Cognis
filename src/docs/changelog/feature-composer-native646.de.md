# Native Layout-Aktionen

**Feature-Zweig:** feature-composer-native646

## Native Layout-Aktionen

Die Haupt- und verschachtelten Layout-Panels verwenden native Steuerelemente vom Typ `button type="button"` für Fertig, Verwerfen und Zurücksetzen. Diese Aktionen senden kein umgebendes Formular ab und lösen keine Navigation aus. Laufende Layout-Speicherungen deaktivieren sie über die bestehende Editorsperre; fehlgeschlagene Speicherungen geben sie für einen ausdrücklichen neuen Versuch wieder frei. Fertig speichert weiterhin und schließt nach Bestätigung, Verwerfen stellt den lokalen Ausgangszustand ohne Schreibzugriff wieder her, und Zurücksetzen speichert das Standardlayout bei fortgesetzter Bearbeitung. Bestehende Aktionsklassen und das Ziel `#composer-edit-toggle` der Arbeitsbereichsanleitung bleiben unverändert.

## Commits

- [7dcf289b56fe90332c57b27f21f108dbb63140f8](https://github.com/Cognis-Labs-HQ/Cognis/commit/7dcf289b56fe90332c57b27f21f108dbb63140f8)
- [45986f62b4584520efcf707b8d1b0c2610a880a8](https://github.com/Cognis-Labs-HQ/Cognis/commit/45986f62b4584520efcf707b8d1b0c2610a880a8)
- [f03db8184a93fb4f015aea9d8b09684e0361eb38](https://github.com/Cognis-Labs-HQ/Cognis/commit/f03db8184a93fb4f015aea9d8b09684e0361eb38)
