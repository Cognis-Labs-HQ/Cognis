# Nachbesserungen für Bereitstellung und Datenbank-Pools

## Versionen von Release-Ressourcen beibehalten

Docker-Images behalten jetzt die beim Build übergebene Ressourcenversion, damit aktualisierte Bereitstellungen zwischengespeicherte statische Ressourcen ungültig machen.

## Datenbank-URLs sicher erstellen

Der Container-Einstiegspunkt kodiert PostgreSQL- und MariaDB-Zugangsdaten prozentual, bevor er sie in Verbindungs-URLs einfügt.

## Datenbankkomponenten isoliert und versioniert halten

Die Validierung der Pool-Einstellungen gehört jetzt zum jeweiligen Datenbankadapter; außerdem sind Adapter- und Gateway-Arbeitsbereichsversionen sowie Abhängigkeitsobergrenzen synchronisiert.
