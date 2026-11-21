# Technische Referenz

Öffentliche Schnittstellen und Betriebsregeln von Leistungsüberwachung.

## Schnittstellen

Leistungsüberwachung wird über den zuständigen Funktionsdienst eingebunden; das Manifest nennt die Komponente und ihre Abhängigkeiten.

## Konfiguration

Die Konfiguration erfolgt über den zuständigen Funktionsdienst. Leistungsüberwachung definiert keine zusätzlichen Einstellungen im Manifest.

## Verhalten

### Observability-Gateway

Das Gateway stellt die herstellerneutrale ctx-Fähigkeit `observability:metrics` und einen größenbegrenzten Endpunkt für stichprobenartige Browser-Telemetrie bereit. Zulässige Metriknamen und Labels begrenzen die Kardinalität. Bereitstellungen können das Ziel austauschen, ohne Routen oder Gateways an einen Telemetrieanbieter zu koppeln.

### Verwendungsbeispiele

`observability:metrics` über `ctx.capabilities` für Servermetriken auflösen oder zugelassene Browsertelemetrie an den Gateway-Endpunkt senden.

## Sicherheit

Der Zugriff auf Leistungsüberwachung unterliegt dem Aufrufer und dem zuständigen Funktionsdienst. Die Aktivierung erweitert keine Kontorechte.

## Referenz

### Technische Spezifikation

Metriknamen und Beschriftungen stehen auf Zulassungslisten, Browsernutzdaten werden stichprobenartig und größenbegrenzt verarbeitet, und das Ziel bleibt über den Capability-Vertrag herstellerneutral und austauschbar.
