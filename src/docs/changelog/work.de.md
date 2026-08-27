# Sichererer Modulstart

## Deaktivierte Module bleiben ungeladen

Deaktivierte externe Module werden bei Routenaktualisierungen nicht mehr importiert oder gestartet. Dadurch wird weder ihr Code auf oberster Ebene noch ihr Lebenszykluscode ausgeführt.

## Scans privater Quellen warten auf Zugangsdaten

Die Erkennung beim Start durchsucht jetzt nur öffentliche Modulquellen. Private Quellen mit Zugangsdaten bleiben für authentifizierte Marketplace-Abfragen verfügbar, ohne dass ein Versuch ohne Zugangsdaten ihre nächste Aktualisierung verzögert.
