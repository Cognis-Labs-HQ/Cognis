# Produktions-UI-Build

## Gehashte Produktionsdateien

Das Produktions-Image stellt nun minimierte, inhaltsgehashte JavaScript- und CSS-Bundles über ein erzeugtes Manifest bereit, während die Entwicklung weiterhin Quellmodule ausliefert.

## Vorkomprimierte Auslieferung

Textdateien werden als Brotli- und gzip-Varianten erzeugt und von der neutralen UI-Route mit unveränderlichem Cache und korrekten MIME-Metadaten ausgehandelt.

## Kompilierte Serverlaufzeit

Der Docker-Build kompiliert TypeScript und startet JavaScript direkt ohne den Entwicklungs-Loader `tsx`.

## Start kompilierter Komponenten

Produktions-Loader für Gateways und Adapter lösen nun jeden TypeScript-Quelleneinstieg in die kompilierte JavaScript-Ausgabe auf, und Study-Adapter erhalten beim Start die Flow-API der Plattform.

## Deterministische Browser-Flows

Integrierte Browser-Flow-Verträge werden nun gemeinsam mit dem geteilten UI-Kontext initialisiert, bevor gebündelte Gateway-Hooks sie erweitern können.

## Der Produktionsstart verwendet kompilierte Assets

Der Produktionsstartbefehl konfiguriert nun das erzeugte UI-Manifest sowie die kompilierten Gateway-, Adapter- und Modulpfade, bevor er den kompilierten Server startet.

## Inhaltskodierung berücksichtigt Qualitätspräferenzen

Die Aushandlung statischer Assets schließt nun mit Qualitätswert null abgelehnte Kodierungen aus und wählt die verfügbare Brotli- oder gzip-Darstellung mit der höchsten akzeptierten Qualität.

## Komponentenregistrierung wird validiert

Produktions-Builds prüfen nun jeden kompilierten Adapter-Einstiegspunkt. Datenbank- und lokale Dateimanifeste verweisen auf ihre tatsächlichen Einstiegsmodule, das Datei-Gateway löst Adapter aus dem konfigurierten kompilierten Stammverzeichnis auf und der Nachrichtenadapter lädt seinen Raum-Schlüsselbeitrag aus dem richtigen Speichermodul.
