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

Die PostgreSQL- und MariaDB-Produktionsprofile für Compose weisen fehlende Datenbankpasswörter, Verbindungs-URLs und Datenverschlüsselungsschlüssel zurück, bevor ein Container erstellt wird.

## Umgebungsprofile ersetzen das veraltete Beispiel

Das veraltete Umgebungsbeispiel im Repository-Stamm wurde entfernt. Die ausgewählten Dateien unter `docker/env/` und der übersetzte DevOps-Leitfaden bilden nun die vollständige Einrichtungsreferenz.

## Compose erstellt Datenbank-Verbindungs-URLs

Jedes Datenbankprofil verlangt nun die systemspezifischen Werte für Host, Port, Datenbank, Benutzername und Passwort und erstellt daraus `DATABASE_URL`. Die `.env` im Repository-Stamm verweist auf das gemeinsame Standardprofil, während der standardmäßige Compose-Link die bestunterstützte PostgreSQL-Bereitstellung auswählt.

## Treiberstandardwerte sind nach System getrennt

Die Standardwerte für Host, Port, Datenbank, Benutzername und Pool von PostgreSQL und MariaDB befinden sich nun ausschließlich in den jeweiligen Treiber-Env-Profilen. Das gemeinsame Standardprofil enthält nur systemneutrale Anwendungseinstellungen.
