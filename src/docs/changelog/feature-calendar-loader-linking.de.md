# Zuverlässige Kalendertests

**Feature-Zweig:** feature-calendar-loader-linking

## Gemeinsame Importe Einmal Verknüpfen

Die Tests der Kalenderdialoge laden jedes lokale Modul nur einmal und verknüpfen den vollständigen Abhängigkeitsgraphen vor der Auswertung. Ein Test mit gezielt überlappenden Importen und verzögerten Dateizugriffen verhindert sporadische Verknüpfungsfehler durch gemeinsame Abhängigkeiten. Das Laufzeitverhalten des Kalenders bleibt unverändert.

## Commits

- [3fe6763b3906be8ba0662b5a2431dcefca4a2f10](https://github.com/Cognis-Labs-HQ/Cognis/commit/3fe6763b3906be8ba0662b5a2431dcefca4a2f10)
