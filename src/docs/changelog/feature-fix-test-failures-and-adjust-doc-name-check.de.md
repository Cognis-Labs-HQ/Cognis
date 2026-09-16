# Zuverlässige Testsuite

**Feature-Zweig:** feature-fix-test-failures-and-adjust-doc-name-check

## Änderungsprotokolle ausgenommen

Die Prüfung der Titellänge für Dokumentationen lässt Einträge des Änderungsprotokolls nun aus, deren Zusammenfassungstitel länger als Navigationsbezeichnungen sein dürfen.

## Fehlgeschlagene Prüfungen repariert

Passwortzurücksetzungen, Verknüpfungen der speicherinternen Datenbank, UI-Quelltextprüfungen, Komponentengrenzen und veraltete Regressionserwartungen funktionieren nun einheitlich.

## Große Dateien aufgeteilt

Übergroße Tests und Laufzeitmodule wurden in übersichtliche Dateien aufgeteilt und halten nun die Größenbegrenzung des Quelltexts ein.

## Änderungen

- [7850b66](https://github.com/Cognis-Labs-HQ/Cognis/commit/7850b66d4241a1b0f4ca12a846f3e7d808875695)
