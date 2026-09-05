# Study-Sprachpakete

## Überblick

Study-Sprachen sind deklarative Inhaltspakete mit Manifest, verbraucherdefiniertem Bibliotheksschema, Sprachdaten und Dokumentation. Sie enthalten keine Browseroberfläche, API-Routen, Stores, CSS oder sprachspezifischen Seiten. Study-Adapter in Cognis erzeugen Oberflächen aus Schema- und Darstellungsmetadaten.

## Paketvertrag

Ein minimales Bootstrap-Modul darf nur sein Installationsverzeichnis bestimmen und `study:library.ingestContentPack(root)` über `ctx` aufrufen. Es importiert keine Bibliotheksinternas. Der Bibliotheksadapter verantwortet Dateisuche, sichere Pfade, Prüfung, stabile IDs, Transaktionen, Idempotenz, Protokollierung und Speicherung. Resolver und externe Wörterbücher sind getrennte Adapter.

## Erforderliche Struktur

```text
cognis-language-ja/
  package.json
  manifest.json
  schema.json
  content/
    characters/hiragana.json
    symbols/common.json
    definitions/core.de.json
    words/beginner-01.json
    sentences/beginner-01.json
  docs/standard.de.md
```

Das Manifest enthält `id`, `publisher`, `version`, `contentRevision`, relative Pfade `schema` und `content` sowie eine Lizenz. Pfade dürfen das Paketverzeichnis nicht verlassen. Gleiche Herausgeber-, Paket- und Versionsangaben mit anderen Daten werden abgelehnt.

## Schema und Inhalte

Das Schema definiert eine stabile ID, eine positive Version, eine BCP-47-Sprache und beliebige Ebenen. Ebenen besitzen typisierte Felder und gerichtete Beziehungen mit Zielebene, Kardinalität, Reihenfolge und optionalem Resolver. Ebenennamen gehören dem Verbraucher: Englisch kann Buchstaben, Koreanisch Jamo und Silbenblöcke definieren.

Jedes direkte Verzeichnis unter `content/` entspricht genau einer Ebenen-ID. JSON-Dateien enthalten ein Datensatzarray oder `{ "records": [...] }`. Datensatz-IDs bleiben innerhalb des Pakets stabil. Beziehungen verwenden diese IDs und bei geordneten Beziehungen eine Position. Vor dem Schreiben prüft Cognis den vollständigen Graphen.

## Einlesen und Oberfläche

`inspectContentPack` liest deterministisch, prüft sichere Pfade, Schema, Felder und Beziehungen und berechnet einen Digest. `ingestContentPack` schreibt Schema, Datensätze, Kanten und Beleg in einer Transaktion. Identische Neuinstallation gilt als unverändert; geänderte Daten mit gleicher Paketversion sind ein Fehler.

Generische Study-Adapter erzeugen Browser-, Detail-, Schriftsystem-, Lexikon-, Satz- und Beziehungsansichten. Inhaltspakete dürfen deklarative Darstellungsangaben, aber keine Templates, Skripte oder CSS liefern. Tokenizer, Hangul-Zerlegung, Morphologie und externe Lookups gehören in über `ctx` verbundene Adapter.
