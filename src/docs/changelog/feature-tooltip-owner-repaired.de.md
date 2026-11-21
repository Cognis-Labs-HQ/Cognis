# Beständige Kontexthilfe

**Feature-Zweig:** feature-tooltip-owner-repaired

## Hilfe mit Fokus oder Zeiger lesen

Gemeinsame Informationsschaltflächen behalten ihre Hilfe, solange sie fokussiert sind oder der Zeiger auf der Schaltfläche oder dem Hilfefeld liegt. Der Wechsel zwischen Schaltflächen wählt die aktuelle Erklärung, ohne dass ein altes Zeigerereignis sie schließt. Das feste, themenabhängige Hilfefeld behält seine Platzierung und erlaubt den Zeigerwechsel über den Abstand hinweg. Wechselt der Tastaturfokus die Erklärung, während der Zeiger auf dem gemeinsamen Hilfefeld bleibt, gehört diese Zeigerinteraktion zur neu angezeigten Erklärung, bis der Zeiger das Feld verlässt oder die Hilfe geschlossen wird.

## Schließen und sauber verlassen

Escape schließt die Hilfe, ohne den Fokus zu verschieben; andere Escape-Aktionen und vorhandene Beschreibungen bleiben erhalten. Eine neue Interaktion kann sie erneut öffnen. Entfernte Schaltflächen und Seitenwechsel schließen die zugehörige Hilfe. Vorhandene übersetzte Texte und Tutorial-Bedienelemente bleiben unverändert.

## Commits

- [015f5ccca865fa29afd10f670f2b54fa0177cbc9](https://github.com/Cognis-Labs-HQ/Cognis/commit/015f5ccca865fa29afd10f670f2b54fa0177cbc9)
