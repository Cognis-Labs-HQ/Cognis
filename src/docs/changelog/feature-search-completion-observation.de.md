# Zuverlässige Suchtests

**Feature-Zweig:** feature-search-completion-observation

## Abgeschlossenes Schließen der Suche prüfen

Tests für die Suchauswahl warten nun innerhalb einer begrenzten Frist auf das Entfernen des Overlays, statt anzunehmen, dass asynchrone Auswahl und Schließanimation nach einer festen Wartezeit abgeschlossen sind. Weiterhin werden Aufrufanzahl, ausgewählte Werte, Zuständigkeit bei Abbrüchen und Navigationsziele geprüft. Ein verzögerter Abschluss gelingt; ein geöffnet bleibendes Suchfenster lässt die Prüfung fehlschlagen.

## Commits

- [02831e31b0dfd3ff7bbe77637391f0fca332ab56](https://github.com/Cognis-Labs-HQ/Cognis/commit/02831e31b0dfd3ff7bbe77637391f0fca332ab56)
