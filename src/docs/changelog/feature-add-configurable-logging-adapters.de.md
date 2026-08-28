# Konfigurierbare Protokollausgaben

**Feature Branch:** feature-add-configurable-logging-adapters

## Unabhängige Protokollstufen für Konsole und Datei

Administratoren können nun getrennte Schweregradschwellen für die Konsolen- und Dateiprotokollierung aus den vom Logging-Gateway unterstützten Stufen auswählen.

## Laufzeitüberschreibungen mit Zurücksetzen auf Umgebungswerte

Einstellungen der Logging-Adapter können Docker-Umgebungswerte zur Laufzeit überschreiben, einschließlich Konsolenformat und Rotation, und auf die Umgebungskonfiguration zurückgesetzt werden. Die Aktion „Zurücksetzen“ zeigt zunächst die Umgebungswerte im Formular; Administratoren müssen „Einstellungen speichern“ auswählen, um das Zurücksetzen zu übernehmen. Der Protokolldateipfad bleibt durch die Umgebung festgelegt. Überschreibungen werden in der Datenbank gespeichert und nach Container-Neustarts wiederhergestellt.

## Einstellungen für dauerhaft aktive Adapter

Die Zeilen „Console Logging“ und „File Logging“ öffnen nun ihr Einstellungsfenster, obwohl diese erforderlichen Adapter nicht deaktiviert werden können.

## Synchronisierte Live-Ausgabe

Die konfigurierte Protokollstufe und das Format ersetzen nun den frühen Bootstrap-Logger für alle danach geladenen Gateways, sodass die Docker-Ausgabe Konsolenänderungen sofort übernimmt. Warnungen zu überschriebenen Umgebungswerten stehen nun orange neben der jeweiligen Feldüberschrift.

## Klarere Konfigurationsbezeichnungen

Warnungen bei Überschreibungen lauten nun „Umgebungsvariable wird überschrieben“, und die Kompressionsoption des Dateiadapters heißt „Log Compression“.

## Adaptereigene, validierte Konfiguration

Konsolen- und Dateiadapter besitzen nun ihre Konfigurationsvalidierung und Zuordnung zur Protokollkonfiguration. Dateiüberschreibungen lehnen unsichere Rotationsgrößen und Aufbewahrungszahlen vor der Anwendung ab.

## Übersetzte Protokolleinstellungen

Feldbeschriftungen verwenden nun adaptereigene deutsche, englische, indonesische und japanische Ressourcen, die die Administration vor der Darstellung des Konfigurationsformulars lädt.

## Abhängigkeitsbewusster Gateway-Start

Der Gateway-Bootstrap berücksichtigt nun deklarierte Abhängigkeiten vor der Prioritätssortierung, damit datenbankgestützte Protokolleinstellungen vor dem Start des Logging-Gateways verfügbar sind.

## Überprüfbare, erweiterbare Konfiguration

Validierungsfehler zur Laufzeit werden nun übersetzt, jeder erkannte Logging-Adapter erhält seine eigene wirksame Konfiguration, und Aktualisierungen sowie Zurücksetzungen erzeugen strukturierte Audit-Ereignisse.

## Konsolenaktualisierungen zur Laufzeit

Änderungen an der Konsolenkonfiguration aktualisieren nun dieselbe Laufzeit-Protokollfunktion, die von der Anwendung und den Konfigurations-Audit-Ereignissen verwendet wird. Neue Stufen und Formate werden dadurch sofort wirksam.

## Docker-Konsolenschwelle

Die frühe Bootstrap-Protokollierung wendet `LOG_LEVEL` nun vor dem Start des Logging-Gateways an, sodass der Docker-Standardwert `info` Debug-Ausgaben während des gesamten Starts unterdrückt.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/1a843d6bcc3ff03b2c40d841f75d29d79da7dc6d
