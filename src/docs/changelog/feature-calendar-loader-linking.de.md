# Zuverlässige Kalendertests

**Feature-Zweig:** feature-calendar-loader-linking

## Gemeinsame Importe Einmal Verknüpfen

Die Tests der Kalenderdialoge laden jedes lokale Modul nur einmal und verknüpfen den vollständigen Abhängigkeitsgraphen vor der Auswertung. Ein Test mit gezielt überlappenden Importen und verzögerten Dateizugriffen verhindert sporadische Verknüpfungsfehler durch gemeinsame Abhängigkeiten. Das Laufzeitverhalten des Kalenders bleibt unverändert.

## Commits

- [983792abacfce6de3bda6ec69a6b9b85c8c1e634](https://github.com/Cognis-Labs-HQ/Cognis/commit/983792abacfce6de3bda6ec69a6b9b85c8c1e634)
