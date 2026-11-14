# Geführte Anleitungen

## Anleitung Verwenden

Wählen Sie in Explore über das ? neben dem Seitentitel die Study-Übersicht. Dieser manuelle Leitfaden erklärt Navigation, gewählte Sprache, verfügbare Wörterbuchsuche und Lerneinstellungen. Er bleibt auf der aktuellen Ebene und überspringt nicht verfügbare Bedienelemente. Sprachleitfäden erklären Inhalte und gelten nur für ihre eigene Sprache.

## Technische Spezifikation

| Seite / Bereich                     | Anleitung         | Zugriff             |
| ----------------------------------- | ----------------- | ------------------- |
| `/study/explore/*`                  | Study-Übersicht   | Angemeldeter Nutzer |
| `/study/settings`, `/study/welcome` | Lerneinstellungen | Angemeldeter Nutzer |

## Übersicht Und Sprachleitfäden

Die Übersicht behält die Abschlusskennung `study:getting-started`. Mit Weiter, Zurück und Neustart lassen sich die Navigationsschritte ohne Seitenwechsel durchgehen. Abgeschlossene Leitfäden können über dasselbe ?-Menü wiederholt werden. Sprachleitfäden können auf Inhaltsseiten ihrer eigenen angemeldeten Sprache automatisch starten; eine andere Sprachauswahl zeigt den zugehörigen Leitfaden.

`study:tutorialTargets` veröffentlicht Study-eigene Navigations- und Zeichenziele sowie die gekapselten Aktionen `route` und `attachDrawing`. `matchesPage` erkennt nur Explore-Pfade der angegebenen Sprache. `isEnrolled(language)` liest bestätigte kontogebundene Einstellungen über `study:navigation`. Die Erkennung navigiert nicht und meldet keine Sprache an. Library besitzt interaktive Kartenabläufe und den allgemeinen Ersatzleitfaden.

Das frühere, ausschließlich zum Sprachverzeichnis gehörende Anleitungsziel `modules` entfällt. Externe Leitfäden müssen die aktuelle Navigation oder eigene Inhalte statt des entfernten Verzeichnisses verwenden.
