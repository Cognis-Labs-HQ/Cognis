# PostgreSQL-Verbindungspool

## PostgreSQL verwendet jetzt einen begrenzten Verbindungspool

Normale Datenbankoperationen können gleichzeitig über `pg.Pool` laufen, während jede Transaktion bis zum Commit oder Rollback an einen Client gebunden bleibt. Umgebungsvariablen begrenzen Poolgröße sowie Verbindungs-, Leerlauf- und optionale Anweisungszeitlimits.

## Beim Herunterfahren werden Datenbankverbindungen geleert

Der PostgreSQL-Adapter registriert das Schließen des Pools über die ctx-Lebenszyklusfähigkeit, damit der Server keine neuen Anfragen annimmt und den Pool sauber leert.

## Docker-Einrichtungen verwenden jetzt eindeutige Umgebungsprofile

Gemeinsame, PostgreSQL-, Entwicklungs- und Produktions-Env-Dateien enthalten nun die Container-Standardwerte. Compose wählt die passenden Profile ohne Interpolation nicht gesetzter Poolvariablen aus und beseitigt dadurch Warnungen über leere Variablen.

## MariaDB verwendet jetzt gleichwertiges Connection-Pooling

Der MariaDB-Adapter verwendet nun einen begrenzten `mysql2`-Pool für gleichzeitige Abfragen, bindet Transaktionen an eine Verbindung, leert den Pool beim Herunterfahren und unterstützt begrenzte Einstellungen für Maximalgröße, Leerlauf- und Verbindungszeitlimit.

## Docker-Profile wählen jetzt den Datenbanktreiber

PostgreSQL und MariaDB besitzen nun getrennte Produktions- und Entwicklungsdateien für Compose und Umgebungsvariablen. Die Administration markiert nur den konfigurierten Datenbankadapter als aktiv, sperrt alle Treiberschalter und erklärt die Docker-Zuständigkeit in der Überschrift des Datenbank-Gateways.

## Produktionscontainer benötigen Geheimnisse vor dem Start

Der Container-Entrypoint für PostgreSQL und MariaDB weist fehlende Datenbankeinstellungen und Datenverschlüsselungsschlüssel sofort zurück und nennt die Env-Datei für jeden fehlenden Wert.

## Umgebungsprofile ersetzen das veraltete Beispiel

Das veraltete Umgebungsbeispiel im Repository-Stamm wurde entfernt. Die ausgewählten Dateien unter `docker/env/` und der übersetzte DevOps-Leitfaden bilden nun die vollständige Einrichtungsreferenz.

## Der Container erstellt Datenbank-Verbindungs-URLs

Jedes Datenbankprofil übergibt die systemspezifischen Werte für Host, Port, Datenbank, Benutzername und Passwort an den Container-Entrypoint, der sie prüft und `DATABASE_URL` ohne Compose-Interpolation erstellt. Die `.env` im Repository-Stamm verweist auf das gemeinsame Standardprofil, während der standardmäßige Compose-Link die bestunterstützte PostgreSQL-Bereitstellung auswählt.

## Treiberstandardwerte sind nach System getrennt

Die Standardwerte für Host, Port, Datenbank, Benutzername und Pool von PostgreSQL und MariaDB befinden sich nun ausschließlich in den jeweiligen Treiber-Env-Profilen. Das gemeinsame Standardprofil enthält nur systemneutrale Anwendungseinstellungen.

## Benutzerverwaltete Geheimnisdateien bleiben unversioniert

Produktions-Env-Dateien mit Geheimnissen werden nun von Git ignoriert und besitzen versionierte `.example`-Vorlagen. Compose-Validierungsfehler nennen die genaue Profildatei, in der jeder fehlende Wert eingetragen werden muss.

## Compose-Env-Importe bleiben repository-relativ

Containerinterne Laufzeitpfade bleiben absolut, wenn ihre Speicherorte bekannt sind. Compose-Env-Dateien und Dockerfile-Importe verwenden nun ausdrückliche repository-relative Pfade, damit über Symlinks erreichte Arbeitsverzeichnisse nicht von einem absoluten Hostpfad abhängen.

## Interaktive Einrichtung ersetzt die Profilvielfalt

Das neue `setup.sh` führt durch die Auswahl von Bereitstellung und Datenbank, erzeugt Geheimnisse, schreibt eine einzige von Git ignorierte Laufzeit-Env-Datei und wählt den passenden Compose-Treiber. Getrennte Entwicklungs-, Produktions-, Treiber- und Beispielprofile sind nicht mehr erforderlich.

## Öffentliche Bereitstellungsidentität ist erforderlich

Die Einrichtung erfasst nun den Cognis-Service-Host, die öffentliche URL und die Kontaktadresse. Docker prüft alle drei Werte, die Anwendung verlangt zusätzlich URL und Kontaktadresse, und Image-Pfade werden vom Entrypoint festgelegt statt als Env-Konfiguration angeboten.

## Versionen von Release-Ressourcen beibehalten

Docker-Images behalten jetzt die beim Build übergebene Ressourcenversion, damit aktualisierte Bereitstellungen zwischengespeicherte statische Ressourcen ungültig machen.

## Datenbank-URLs sicher erstellen

Der Container-Einstiegspunkt kodiert PostgreSQL- und MariaDB-Zugangsdaten prozentual, bevor er sie in Verbindungs-URLs einfügt.

## Datenbankkomponenten isoliert und versioniert halten

Die Validierung der Pool-Einstellungen gehört jetzt zum jeweiligen Datenbankadapter; außerdem sind Adapter- und Gateway-Arbeitsbereichsversionen sowie Abhängigkeitsobergrenzen synchronisiert.
