# Zuverlässige Einrichtung der Modulkonfiguration

## Deaktivierte Module vor der Aktivierung konfigurieren

Wenn eine moduleigene Konfigurationsroute nicht verfügbar ist, öffnet Cognis nun das Einstellungsformular mit den Standardwerten des Manifests und aktiviert das Modul erst beim Speichern. Anschließend werden die Werte sofort über die eingebundene Modulroute geschrieben, sodass erforderliche API-Schlüssel ohne 404-Fehler oder Zwischenspeicherung im Browser gespeichert werden können.

## Erforderliche Einrichtung nach leeren Aktivierungsantworten abschließen

Der Aktivierungsablauf setzt die erforderliche Konfiguration nun fort, wenn der Aktivierungsendpunkt ordnungsgemäß eine leere Erfolgsantwort liefert. Die Einstellungen bleiben über das Zahnrad in den Moduldetails erreichbar; eine fehlgeschlagene oder abgebrochene erforderliche Einrichtung setzt das Modul weiterhin auf deaktiviert zurück.
