# Lernfortschrittsereignisse

**Feature-Zweig:** work

## Unveränderliche Fortschrittsmessung

Fügt datenschutzbezogene, idempotente Lernereignisse, ausgleichende Korrekturen, wiederherstellbare Lernstandsprojektionen, mehrdimensionale Aggregation und einen gestuften Erweiterungsablauf hinzu.

## Metadatenfiltergruppen funktionieren

Bibliotheks-Metadatengruppen können nun exklusive Einzelauswahlpillen festlegen oder Mehrfachauswahl erlauben. Eine Auswahl blendet nicht passende Karten sofort aus, auch wenn deren Rasterdarstellung zuvor den Zustand `hidden` übersteuerte.

## Authentifiziertes Audio mit Thema

Bibliotheksaudio wird nun über den authentifizierten Study-Gateway-Client statt über eine nicht authentifizierte native Medienanfrage geladen. Temporäre Medien-URLs werden danach bereinigt, und native Steuerelemente folgen dem hellen oder dunklen Anwendungsthema.

## Konforme Bibliotheks-UI-Struktur

Der Einstiegspunkt des Bibliotheksbrowsers wurde in die vorgeschriebene Adapterstruktur `ui/app/index.js` verschoben. Laufzeitroute und Strukturtests wurden aktualisiert. Dokumentationsprüfungen ignorieren nun erzeugte Build-Ausgaben, Benennungsprüfungen erfassen die verschobene Quelle sauber, und Routertests berücksichtigen dynamische Gateway-Routen sowie erhaltene Navigationszustände.

## Wiederholbare Inhaltsimporte

Inhaltspakete der Lernbibliothek aktualisieren jetzt bereits vorhandene Datensätze, Anlagen und Verweise, bevor fehlende Inhalte erstellt werden. Dadurch unterbrechen doppelte Schlüssel eine erneute Modulaktivierung nicht mehr.

## Nicht blockierende Aktivierung

Ein Modul bleibt aktiviert, wenn sein Inhaltsimport beim Start aus einem anderen Grund fehlschlägt. Cognis protokolliert den Startfehler als Warnung und entfernt unvollständige Laufzeitbeiträge.

## Commits

- [1d65413](https://github.com/Cognis-Labs-HQ/Cognis/commit/1d65413154f89efbd91422bbfdc94bc8196e9f16)
- [656b59f](https://github.com/Cognis-Labs-HQ/Cognis/commit/656b59feef1ff344ce911a042eecae788a228cc4)
- [e183481](https://github.com/Cognis-Labs-HQ/Cognis/commit/e18348130104134eaa7962aa3020a03a22325e86)
- [ba25e44](https://github.com/Cognis-Labs-HQ/Cognis/commit/ba25e4481d6c71a35ebe2ecc8d0143b85f0125b3)
- [ef782975](https://github.com/Cognis-Labs-HQ/Cognis/commit/ef782975)
