# Sicherere, übersetzte Laufzeit-Protokolleinstellungen

## Protokolladapter besitzen nun ihre Konfigurationsregeln

Konsolen- und Dateiadapter definieren ihre eigene Validierung und Zuordnung zur Protokollkonfiguration, sodass adapterspezifische Einstellungen nicht in der Gateway-Route liegen.

## Überschreibungen der Dateiprotokollierung sind eingeschränkt

Das Laufzeitformular erlaubt keine Änderung des durch die Umgebung festgelegten Protokollpfads mehr und lehnt unsichere Rotationsgrößen sowie Aufbewahrungszahlen vor der Anwendung ab.

## Protokolleinstellungen sind übersetzt

Beschriftungen für Konsolen- und Dateieinstellungen verwenden nun komponenteneigene deutsche, englische, indonesische und japanische Ressourcen.

Das Administrationsfenster lädt nun vor der Darstellung der Konfigurationsfelder die angekündigten Sprachressourcen des jeweiligen Adapters.
