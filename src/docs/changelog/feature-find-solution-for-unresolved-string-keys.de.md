# Lokalisierte Modulsuche

**Feature Branch:** feature-find-solution-for-unresolved-string-keys

## Modulnamen erscheinen sofort

Der Modulmarktplatz speichert nun die lokalisierten Texte jedes gefundenen Moduls zwischen und stellt sie bereit. Namen, Zusammenfassungen, Kategorien und Schlagwörter werden dadurch bereits vor der Installation beim ersten Laden übersetzt.

## Der Core bleibt in der Core-Laufzeit

Der Routenlader für externe Module ignoriert nun Core-Manifeste und sucht Cognis Core daher nicht mehr im Installationsverzeichnis für externe Module.

## Klarere Struktur des Marktplatzladers

Das Laden des Marktplatzes liegt nun in einem eigenen Verzeichnis. Katalogsuche, Repository-Zugriff und öffentlicher Dienst sind in kleinere Dateien aufgeteilt, die deutlich unter der Größenbegrenzung bleiben.

## Commits

- [6f98263](https://github.com/Cognis-Labs-HQ/Cognis/commit/6f98263dd67dd20b8b86d4bed66c4ace97b3d296)
