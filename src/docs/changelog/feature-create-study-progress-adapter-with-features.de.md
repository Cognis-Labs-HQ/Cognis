# Lernfortschrittsereignisse

**Feature-Zweig:** feature-create-study-progress-adapter-with-features

## Unveränderliche Fortschrittsmessung

Fügt datenschutzbezogene, idempotente Lernereignisse, ausgleichende Korrekturen, wiederherstellbare Lernstandsprojektionen, mehrdimensionale Aggregation und einen gestuften Erweiterungsablauf hinzu.

## Metadatenfiltergruppen funktionieren

Bibliotheks-Metadatengruppen können nun exklusive Einzelauswahlpillen festlegen oder Mehrfachauswahl erlauben. Eine Auswahl blendet nicht passende Karten sofort aus, auch wenn deren Rasterdarstellung zuvor den Zustand `hidden` übersteuerte.

## Authentifiziertes Audio mit Thema

Bibliotheksaudio wird nun über den authentifizierten Study-Gateway-Client statt über eine nicht authentifizierte native Medienanfrage geladen. Temporäre Medien-URLs werden danach bereinigt, und native Steuerelemente folgen dem hellen oder dunklen Anwendungsthema.

## Konforme Bibliotheks-UI-Struktur

Der Einstiegspunkt des Bibliotheksbrowsers wurde in die vorgeschriebene Adapterstruktur `ui/app/index.js` verschoben. Laufzeitroute und Strukturtests wurden aktualisiert. Dokumentationsprüfungen ignorieren nun erzeugte Build-Ausgaben, Benennungsprüfungen erfassen die verschobene Quelle sauber, und Routertests berücksichtigen dynamische Gateway-Routen sowie erhaltene Navigationszustände.

## Wiederholbare Inhaltsimporte

Die Tabellenbereitstellung von PostgreSQL und MariaDB repariert jetzt eindeutige Indizes für deklarierte Primär- und eindeutige Schlüssel bestehender Tabellen. Lernbibliotheksimporte verwenden diese garantierten Konfliktziele für atomare Upserts von Datensätzen, Anlagen und Verweisen und verhindern doppelte Schlüssel bei wiederholter oder gleichzeitiger Modulaktivierung.

## Commits

- [1d65413](https://github.com/Cognis-Labs-HQ/Cognis/commit/1d65413154f89efbd91422bbfdc94bc8196e9f16)
- [656b59f](https://github.com/Cognis-Labs-HQ/Cognis/commit/656b59feef1ff344ce911a042eecae788a228cc4)
- [e183481](https://github.com/Cognis-Labs-HQ/Cognis/commit/e18348130104134eaa7962aa3020a03a22325e86)
- [ba25e44](https://github.com/Cognis-Labs-HQ/Cognis/commit/ba25e4481d6c71a35ebe2ecc8d0143b85f0125b3)
- [ef782975](https://github.com/Cognis-Labs-HQ/Cognis/commit/ef782975)
- [68bd7478](https://github.com/Cognis-Labs-HQ/Cognis/commit/68bd7478dbf6343109087bd83a9fba643452a838)
- [eeabc5e1](https://github.com/Cognis-Labs-HQ/Cognis/commit/eeabc5e1231e3de246a14ee4ff49582a7169768c)
- [2cc37134](https://github.com/Cognis-Labs-HQ/Cognis/commit/2cc371343c54afed45e545d523a751cad101be3c)
- [ad01aa56](https://github.com/Cognis-Labs-HQ/Cognis/commit/ad01aa561321b7db5982b0fbfe7f1b28ed11347b)
- [9fe9af00](https://github.com/Cognis-Labs-HQ/Cognis/commit/9fe9af0021f9a093ba432fca9761368e8df0e5f6)
