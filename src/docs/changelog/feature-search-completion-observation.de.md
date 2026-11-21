# Zuverlässige Suchtests

**Feature-Zweig:** feature-search-completion-observation

## Abgeschlossenes Schließen der Suche prüfen

Tests für die Suchauswahl warten nun innerhalb einer begrenzten Frist auf das Entfernen des Overlays, statt anzunehmen, dass asynchrone Auswahl und Schließanimation nach einer festen Wartezeit abgeschlossen sind. Weiterhin werden Aufrufanzahl, ausgewählte Werte, Zuständigkeit bei Abbrüchen und Navigationsziele geprüft. Ein verzögerter Abschluss gelingt; ein geöffnet bleibendes Suchfenster lässt die Prüfung fehlschlagen.

## Commits

- [b6b3bec4110a097884ca1edd5302c63761ad222a](https://github.com/Cognis-Labs-HQ/Cognis/commit/b6b3bec4110a097884ca1edd5302c63761ad222a)
