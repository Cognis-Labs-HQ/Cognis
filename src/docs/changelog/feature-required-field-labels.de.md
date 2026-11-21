# Pflichtzeichen in einer Zeile

**Feature-Zweig:** feature-required-field-labels

## Pflichtzeichen bei Überschriften halten

Gemeinsame Feldüberschriften behalten den Pflichtstern in ihrem Textcontainer, auch beim Passwortschutz in Freigaben. Lange Beschriftungen können umbrechen, ohne die Markierung als eigene Rasterzelle anzuordnen.

## Pflichtstatus einheitlich aktualisieren

Dynamische Pflichtänderungen verwenden für alle unterstützten Feldtypen dieselbe Überschrift. Erforderliche Optionsgruppen ohne Auswahl werden ohne Fehler durch ein fehlendes Eingabefeld validiert. Feldzuordnungen, formatierte Beschriftungen und getrennte Hilfeschaltflächen bleiben erhalten.

Beim Wechsel der gewählten Option wird die Fehlerdarstellung für die gesamte Gruppe entfernt, ohne Wert oder Fokus zu ändern.

## Commits

- [769cf90d473487329d2bac477f1a3bd6881242c9](https://github.com/Cognis-Labs-HQ/Cognis/commit/769cf90d473487329d2bac477f1a3bd6881242c9)
