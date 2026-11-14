# Zuverlässige Kalendertests

**Feature-Zweig:** feature-calendar-loader-linking

## Gemeinsame Importe Einmal Verknüpfen

Die Tests der Kalenderdialoge laden jedes lokale Modul nur einmal und verknüpfen den vollständigen Abhängigkeitsgraphen vor der Auswertung. Ein Test mit gezielt überlappenden Importen und verzögerten Dateizugriffen verhindert sporadische Verknüpfungsfehler durch gemeinsame Abhängigkeiten. Das Laufzeitverhalten des Kalenders bleibt unverändert.

## Commits

- [fa0627211544875e4063801f7f63a95f61f028c9](https://github.com/Cognis-Labs-HQ/Cognis/commit/fa0627211544875e4063801f7f63a95f61f028c9)
