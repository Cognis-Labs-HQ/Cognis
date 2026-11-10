# Geführte Anleitungen

Diese Anleitungen erklären die verfügbaren Aktionen dieser Komponente.

## Anleitung verwenden

Öffnen Sie eine der folgenden Seiten für eine noch nicht abgeschlossene Anleitung. Über das ? neben dem Seitentitel wiederholen Sie eine abgeschlossene Anleitung; Überspringen beendet die Wiederholung.

## Technische Spezifikation

| Seite / Bereich                  | Anleitung         | Zugriff             |
| -------------------------------- | ----------------- | ------------------- |
| `/study`                         | Study-Übersicht   | Angemeldeter Nutzer |
| `^/study/(?:settings\|welcome)$` | Lerneinstellungen | Angemeldeter Nutzer |

## Übersicht Und Sprachleitfäden

Der Leitfaden auf `/study` erklärt die Aktivitätsnavigation, gewählte Lernsprachen, verfügbare Module, Wörterbuchsuche und Lerneinstellungen. Nicht verfügbare Bedienelemente entfallen; Kartenabläufe werden nicht wiederholt.

`study:tutorialTargets` veröffentlicht Navigation und Zeichenziele aus Study sowie die gekapselten Aktionen `route` und `attachDrawing`. `isEnrolled(language)` liest bestätigte Einstellungen über `study:navigation`, kontogebunden und bei Änderungen ungültig gemacht. Ein Sprachbesuch ist keine Anmeldung.

Sprachleitfäden sind im ?-Menü der Übersicht wählbar. Diese bewusste Auswahl öffnet die Explore-Inhalte der Sprache. Automatisch starten sie nur auf den eigenen Inhaltsseiten und behalten eine bereits geöffnete Ebene bei. Library besitzt den interaktiven Kartenablauf und den allgemeinen Ersatzleitfaden; siehe Komponentendokumentation.
