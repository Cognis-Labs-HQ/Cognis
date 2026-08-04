# Produktions-UI-Build

## Gehashte Produktionsdateien

Das Produktions-Image stellt nun minimierte, inhaltsgehashte JavaScript- und CSS-Bundles über ein erzeugtes Manifest bereit, während die Entwicklung weiterhin Quellmodule ausliefert.

## Vorkomprimierte Auslieferung

Textdateien werden als Brotli- und gzip-Varianten erzeugt und von der neutralen UI-Route mit unveränderlichem Cache und korrekten MIME-Metadaten ausgehandelt.

## Kompilierte Serverlaufzeit

Der Docker-Build kompiliert TypeScript und startet JavaScript direkt ohne den Entwicklungs-Loader `tsx`.

## Start kompilierter Komponenten

Produktions-Loader für Gateways und Adapter lösen nun jeden TypeScript-Quelleneinstieg in die kompilierte JavaScript-Ausgabe auf, und Study-Adapter erhalten beim Start die Flow-API der Plattform.
