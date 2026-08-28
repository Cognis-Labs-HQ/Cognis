# Durchsuchbarer Docs-Verlauf

**Feature Branch:** feature-add-versioning-system-for-docs

## Versionierte Dokumentations-Snapshots

Cognis archiviert nun beim Start die Dokumentation jeder Komponente mit der im Komponentenmanifest angegebenen Version. Dokumentations-URLs verwenden standardmäßig die magische Version `latest`, während ältere Snapshots verfügbar bleiben.

Die Dokumentations- und Änderungsprotokollansichten verarbeiten nun einen nicht verfügbaren oder fehlerhaften Dokumentationsindex, ohne dass die Seite beim Laden abstürzt.

In der lokalen Entwicklung werden Snapshots nun im Cognis-Verzeichnis des aktuellen Benutzers gespeichert. Paketierte Server enthalten außerdem das Plattformmanifest, das zur Versionierung der Stammdokumentation benötigt wird. Dadurch antwortet die Docs-API bei einer vom Quellbaum abweichenden Laufzeitstruktur nicht mehr mit `400`.

## Versionsauswahl

Die Dokumentationsansicht zeigt nun über jedem Dokumenttitel eine horizontal scrollbare Versionsleiste, über die aktuelle und ältere Inhalte ausgewählt werden können.

## Entfernte Dokumente bleiben verfügbar

Der Dokumentationsindex enthält nun archivierte Dokumente auch dann, wenn ihre Quelldatei umbenannt oder entfernt wurde. Dadurch bleiben alle gespeicherten Versionen durchsuchbar.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/ad5ede84f3181c47669ecc0e3655b4321fba8a34
