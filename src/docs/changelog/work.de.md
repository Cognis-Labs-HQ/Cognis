# Zuverlässiger App-Cache

## Bereitstellungsspezifische Asset-Versionen

Produktions-Container enthalten nun die Git-Commit-Version in Asset-URLs, damit unveränderliche Browser- und CDN-Caches keine ältere Anwendungsversion behalten.

## Sichere und offlinefähige Auslieferung

Statische Verzeichnisse werden abgewiesen, bevor Antwort-Header gesendet werden, und unversionierte Anwendungsabhängigkeiten bleiben über den Service Worker ohne Netzwerk verfügbar.
