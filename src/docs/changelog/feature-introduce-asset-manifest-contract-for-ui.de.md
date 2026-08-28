# Revisionen für Assets

**Feature Branch:** feature-introduce-asset-manifest-contract-for-ui

## Unveränderliche versionierte Assets

UI-Assets tragen nun eine Bereitstellungsrevision und werden langfristig unveränderlich zwischengespeichert, während veränderliche Dokumente neu validiert werden.

## Effiziente Validierung

Nicht versionierte Assets unterstützen Validatoren, sodass aktuelle Client-Kopien ohne Lesen des Dateiinhalts den Status 304 erhalten.

## Bereitstellungsspezifische Asset-Versionen

Produktions-Container enthalten nun die Git-Commit-Version in Asset-URLs, damit unveränderliche Browser- und CDN-Caches keine ältere Anwendungsversion behalten.

## Sichere und offlinefähige Auslieferung

Statische Verzeichnisse werden abgewiesen, bevor Antwort-Header gesendet werden, und unversionierte Anwendungsabhängigkeiten bleiben über den Service Worker ohne Netzwerk verfügbar.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/9545de212904420948eebc1b442bc6dd85bb5f79
