# Zuverlässige Modultexte

**Feature Branch:** feature-investigate-module-polling-failures

## Keine Abfragen fehlender Texte

Der Modulkatalog gibt Lokalisierungsressourcen nur noch bekannt, nachdem die erforderliche englische Textdatei im Servercache bestätigt wurde. Die regelmäßige Marktplatzabfrage wiederholt daher keine Anfragen an Textadressen mehr, die nur 404 zurückgeben können.

Die Marktplatzoberfläche behält diese Unterdrückung nun ebenfalls bei, statt für Katalogeinträge mit fehlender Lokalisierungsressource eine konventionelle statische Adresse zu rekonstruieren.

## Modulquellen beim Start aktualisieren

Cognis führt nun beim Start der API einmalig eine erzwungene Suche der Modulquellen durch. Dadurch werden zwischengespeicherte Lokalisierungsressourcen vor Beginn der Marktplatzabfragen aktualisiert, sodass Module mit gültigen Textdateien nach einem Neustart ihre übersetzten Namen und Zusammenfassungen auflösen.

## Modulaktualisierungen stabil halten

Regelmäßige Marktplatzprüfungen lassen die aktuell dargestellten Modulkarten nun sichtbar, bis sowohl Cache- als auch Quelldaten bereitstehen, wodurch zwischenzeitliches Aufblitzen von Text vermieden wird. Ressourcen aktivierter Module bleiben außerdem während der Aktualisierung ihrer UI-Beiträge direkt erreichbar, sodass nach der Aktivierung keine vorübergehenden Fehler bei Navigationsabhängigkeiten auftreten.

## Alle Modulübersetzungen laden

Texte öffentlicher GitHub-Module verwenden nun den Rohdaten-Endpunkt des Repositorys. Dies entspricht der Übergabe der Sprachdateien durch Nextcloud Whiteboard an Cognis und vermeidet API-Anfragelimits bei paralleler Erkennung. Metadaten von Jitsi Meet, Nextcloud Whiteboard und den Study-Sprachmodulen werden dadurch zuverlässig aufgelöst, statt davon abzuhängen, welche Sprachanfragen vor Erreichen des Limits abgeschlossen wurden.

## Unvollständige Modulcaches erkennen

Die API protokolliert eine strukturierte Warnung mit Modul, Sprache und Ressourcenkennung, wenn ein Modul Lokalisierung deklariert, aber die englische Ressource im Cache fehlt. Eine erneute Quellensuche kann den Cache auffüllen; Modulautoren müssen weiterhin `ui/languages/en/strings.xml` und die übrigen unterstützten Übersetzungen bereitstellen.

## Module vor der Prüfung konfigurieren

Routen, die ein Modul ausdrücklich als im deaktivierten Zustand verfügbar kennzeichnet, werden nun in einem eingeschränkten Konfigurationsstart registriert. Andere Routen, UI-Beiträge, Fähigkeiten und Ablauf-Hooks bleiben inaktiv. Administratoren können dadurch Module wie Jitsi Meet konfigurieren, bevor die Aktivierungsprüfung diese Konfiguration kontrolliert.

## Deaktivierte Module bleiben ungeladen

Deaktivierte externe Module werden bei Routenaktualisierungen nicht mehr importiert oder gestartet. Dadurch wird weder ihr Code auf oberster Ebene noch ihr Lebenszykluscode ausgeführt.

## Scans privater Quellen warten auf Zugangsdaten

Die Erkennung beim Start durchsucht jetzt nur öffentliche Modulquellen. Private Quellen mit Zugangsdaten bleiben für authentifizierte Marketplace-Abfragen verfügbar, ohne dass ein Versuch ohne Zugangsdaten ihre nächste Aktualisierung verzögert.

## Commits

- [54375e3](https://github.com/Cognis-Labs-HQ/Cognis/commit/54375e318faa1ddbb6fe950f2402957742102af9)
