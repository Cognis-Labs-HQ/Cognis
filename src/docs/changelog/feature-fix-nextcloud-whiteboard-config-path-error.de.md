# Zuverlässiger Start der Modulverwaltung

## Modulbereitschaft anhand des Whiteboard-Status melden

Der Whiteboard-Bereitschaftsendpunkt bildet jetzt den Datenbank- und Konfigurationsstatus ab, ohne die Profilabhängigkeitsprüfung des Modullebenszyklus zu wiederholen. Ein aktiver Profiladapter wird aufgrund der Initialisierungsreihenfolge nicht mehr fälschlicherweise als fehlend gemeldet.

## Zusammenarbeitsrouten vor der Profilinitialisierung registrieren

Nextcloud Whiteboard registriert seine Boardlisten- und Vorabprüfungsrouten jetzt auch dann, wenn der Profildienst später initialisiert wird. Anfragen verwenden die jeweils aktuelle Profilfunktion, wodurch vorübergehende Route-nicht-gefunden-Antworten beim Start verhindert werden.

## Startbereitschaft auf das zuständige Modul beschränken

Die Startzuverlässigkeit wird innerhalb von Nextcloud Whiteboard gewährleistet, anstatt jede API-Anfrage zu verzögern. Dadurch bleibt der gemeinsame Serverlebenszyklus unverändert, während die betroffenen Verwaltungsrouten unabhängig von Profildiensten verfügbar sind.

## Konfiguration unabhängig von Profildiensten halten

Nextcloud Whiteboard registriert seine Konfigurations- und Aktivierungsendpunkte jetzt, sobald der Datenbankspeicher verfügbar ist. Administratoren können das Modul konfigurieren, auch wenn der separate Profildienst für die Whiteboard-Zusammenarbeit nicht verfügbar ist.
