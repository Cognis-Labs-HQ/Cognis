# Pflichtzeichen in einer Zeile

**Feature-Zweig:** feature-required-field-labels

## Pflichtzeichen bei Überschriften halten

Gemeinsame Feldüberschriften behalten den Pflichtstern in ihrem Textcontainer, auch beim Passwortschutz in Freigaben. Lange Beschriftungen können umbrechen, ohne die Markierung als eigene Rasterzelle anzuordnen.

## Pflichtstatus einheitlich aktualisieren

Dynamische Pflichtänderungen verwenden für alle unterstützten Feldtypen dieselbe Überschrift. Erforderliche Optionsgruppen ohne Auswahl werden ohne Fehler durch ein fehlendes Eingabefeld validiert. Feldzuordnungen, formatierte Beschriftungen und getrennte Hilfeschaltflächen bleiben erhalten.

Beim Wechsel der gewählten Option wird die Fehlerdarstellung für die gesamte Gruppe entfernt, ohne Wert oder Fokus zu ändern.

## Commits

- [Pflichtzeichen bei gemeinsamen Feldüberschriften halten](https://github.com/Cognis-Labs-HQ/Cognis/commit/e19109e9018847a6c7f3e62848c07a3f98c489cc)
- [Pflichtprüfung für Optionsgruppen vereinheitlichen](https://github.com/Cognis-Labs-HQ/Cognis/commit/d062b6191d45a1de33273bc8e09590a2c6b51b28)
