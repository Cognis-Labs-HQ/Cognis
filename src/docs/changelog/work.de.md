# Modul-Einstellungen wie bei Adaptern

## Modulzeilen öffnen jetzt einheitliche Einstellungen

Jitsi Meet und Nextcloud Whiteboard öffnen ihre Konfiguration nun direkt über die Modulzeile statt über ein separates Zahnrad und verhalten sich damit wie Adapter-Konfigurationen.

## Einstellungen enthalten Modul-Schalter

Das Modul-Einstellungs-Popup enthält jetzt einen Aktivieren-Schalter, damit Administratoren Konfiguration und Betriebszustand gemeinsam anpassen können.

## Fehlende Abhängigkeiten zeigen einen klaren Einstellungsfehler

Nextcloud Whiteboard registriert seine Einstellungs-Endpunkte weiterhin, wenn erforderliche Laufzeitabhängigkeiten fehlen. Administratoren erhalten dadurch eine Dienst-nicht-verfügbar-Antwort statt eines 404 für eine fehlende Route.
