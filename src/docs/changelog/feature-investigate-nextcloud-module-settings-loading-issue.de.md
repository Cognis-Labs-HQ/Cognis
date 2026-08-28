# Modul-Einstellungen wie bei Adaptern

**Feature Branch:** feature-investigate-nextcloud-module-settings-loading-issue

## Modulzeilen öffnen jetzt einheitliche Einstellungen

Jitsi Meet und Nextcloud Whiteboard öffnen ihre Konfiguration nun direkt über die Modulzeile statt über ein separates Zahnrad und verhalten sich damit wie Adapter-Konfigurationen.

## Einstellungen enthalten Modul-Schalter

Das Modul-Einstellungs-Popup enthält jetzt einen Aktivieren-Schalter, damit Administratoren Konfiguration und Betriebszustand gemeinsam anpassen können.

## Fehlende Abhängigkeiten zeigen einen klaren Einstellungsfehler

Nextcloud Whiteboard registriert seine Einstellungs-Endpunkte weiterhin, wenn erforderliche Laufzeitabhängigkeiten fehlen. Administratoren erhalten dadurch eine Dienst-nicht-verfügbar-Antwort statt eines 404 für eine fehlende Route.

## Teilaktualisierungen können vor dem Secret gespeichert werden

Nextcloud-Whiteboard-Einstellungen akzeptieren jetzt Aktualisierungen von Server-URL und Upload-Limit auch dann, wenn das API-Schlüsselfeld absichtlich leer bleibt. Das Modul wird weiterhin erst nach Hinterlegung eines gültigen Schlüssels als vollständig konfiguriert gemeldet.

## Feldgenaue Validierung hält Einstellungen geöffnet

Validierungsfehler in Moduleinstellungen benennen jetzt das ungültige Feld. Dadurch kann das gemeinsame Konfigurations-Popup geöffnet bleiben und dieses Eingabefeld markieren, statt gültige Admin-Änderungen zu verwerfen.

## Commits

- [e33bb93](https://github.com/Cognis-Labs-HQ/Cognis/commit/e33bb93726bab2eb01bf3d24f3704d2b4127dda0)
