# Bildvorschau abbrechen

**Feature-Zweig:** feature-image-cancellation644

## Wartende Bildvorschau abbrechen

Ein Abbruch durch den Aufrufer oder das Entfernen des Anbieters beendet eine wartende Bildvorschau, ohne auf Übersetzungen oder das Popup-Stylesheet zu warten. Späte Ergebnisse öffnen die abgebrochene Vorschau nicht erneut und zeigen keine zugehörige Fehlermeldung. Andere Aufrufer nutzen die gemeinsame Vorbereitung weiter.

## Verantwortung beibehalten

Die öffentliche Aktion open lehnt bei Abbruch mit AbortError ab; bewusstes Schließen wird weiterhin normal abgeschlossen. Der Austausch eines Vorschaubilds bei unverändert aktivem Aufrufersignal erhält die Ansicht des ursprünglichen Bilds. Ohne Aufrufersignal gehört die Ansicht zum Anbieter; unabhängige Routenwechsel schließen sie nicht. Bild-URLs bleiben in der Verantwortung des Aufrufers. Bestehende Library-Tutorialziele und Aktionen bleiben unverändert; der Abbruch fügt keinen Bedienungsschritt hinzu.

## Commits

- [f09d6675a74b6e4f0de7f204c8ad5351f60fc918](https://github.com/Cognis-Labs-HQ/Cognis/commit/f09d6675a74b6e4f0de7f204c8ad5351f60fc918)
