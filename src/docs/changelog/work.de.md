# Flexible Studienbibliothek

## Neugestaltung des Beziehungsframeworks festlegen

Ein stufenweiser Implementierungsplan ersetzt feste Bibliotheksschichten durch verbrauchereigene Schemata, geprüfte generische Beziehungen, austauschbare Auflösungs- und Lookup-Flows, vollständige Detailansichten, Deep Links und eine rücksetzbare Migration.

## Neugestaltung umsetzen

Feste Ebenen wurden durch gespeicherte, versionierte Verbraucherschemata ersetzt. Typisierte Felder, Kardinalität, geordnete Kanten, Schemaversionen und sichtbare Beziehungsziele werden geprüft. Unicode-Graphemauflösung und entfernbare Lookup-Anbieter mit Herkunft wurden ergänzt.

## Beziehungen vollständig durchsuchen

Neutrale Schema-, Detail-, Trace-, Auflösungs- und Lookup-APIs sowie eine schemagesteuerte Oberfläche zeigen beliebige Ebenen, Felder, Bestandteile und eingehende Verwendungen unter dauerhaft ladbaren Detailadressen.

## Inkompatible Capability-Änderung

Der Adapter hat nun Version 2.0.0. Verbraucher registrieren ein Schema und verwenden dessen Schema- und Beziehungs-IDs anstelle des entfernten festen Katalogs, der Vorlagenklone und schichtspezifischen Import- und Exportmethoden.

## Commits

- [2db6fd1a](https://github.com/Cognis-Labs-HQ/Cognis/commit/2db6fd1a147194de35f45b07090d0b5356206933)
- [45c1c7e0](https://github.com/Cognis-Labs-HQ/Cognis/commit/45c1c7e011bfde255e69e0dcf87b01e95600c49a)
