# Zuverlässige Kalendertests

**Feature-Zweig:** feature-calendar-loader-linking

## Gemeinsame Importe Einmal Verknüpfen

Die Tests der Kalenderdialoge laden jedes lokale Modul nur einmal und verknüpfen den vollständigen Abhängigkeitsgraphen vor der Auswertung. Ein Test mit gezielt überlappenden Importen und verzögerten Dateizugriffen verhindert sporadische Verknüpfungsfehler durch gemeinsame Abhängigkeiten. Das Laufzeitverhalten des Kalenders bleibt unverändert.

## Commits

- [3c4b218767135a93f1cb9cd7def3dece4507809e](https://github.com/Cognis-Labs-HQ/Cognis/commit/3c4b218767135a93f1cb9cd7def3dece4507809e)
