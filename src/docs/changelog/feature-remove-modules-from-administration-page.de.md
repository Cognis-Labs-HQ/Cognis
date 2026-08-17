# Modul-Marktplatz

## Ein eigener App-Store

Module besitzen nun eine separate Verwaltungsseite mit Ansichten für installierte, verfügbare, empfohlene und kategorisierte Angebote sowie konfigurierbaren GitHub- und GitLab-Quellen.

## Externe Repositorys

Administratoren können öffentliche oder private Repositorys mit optionalen, im Schlüsselbund geschützten PATs finden; Cognis prüft bei der Installation Manifest und unveränderliche UUID.

## UUID-Abhängigkeiten

Alle Komponentenmanifeste behalten lesbare Namen und IDs, verwenden für Abhängigkeiten aber stabile UUIDs.

## Zuverlässige Marktplatz-Steuerung

Modulkarten, Filter, Quelleneinstellungen und Lebenszyklusaktionen aktualisieren nun sofort den Marktplatzinhalt, ohne das umgebende Seitenlayout zurückzusetzen. Moduldetails behalten die Store-Navigation bei, während einheitlich große Karten Beschreibungen und Lebenszyklusaktionen ausrichten.

Externe Checkouts durchlaufen nun vor dem Ersetzen einer aktiven Installation eine Repository-Prüfung für Paket- und Routenverträge, Einstiegspunkte, Grafiken, sichere Pfade und optionale Datei-Prüfsummen.
