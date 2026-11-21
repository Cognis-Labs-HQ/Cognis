# Technische Referenz

Öffentliche Schnittstellen und Betriebsregeln von Leistungsüberwachung.

## Schnittstellen

observability:metrics.record(name, value, labels) erfasst endliche erlaubte Werte. POST /api/v1/observability/client nimmt metrics und navigation an, maximal sechzehn Messwerte und 16.384 Zeichen akkumulierten Text.

## Konfiguration

Die eingebaute Ausgabe schreibt Debug-Logs. Namen und Labelschlüssel sind begrenzt; andere Ausgaben implementieren observability:metrics.record ohne anbieterspezifische Route.

## Verhalten

### Observability-Gateway

Das Gateway stellt die herstellerneutrale ctx-Fähigkeit `observability:metrics` und einen größenbegrenzten Endpunkt für stichprobenartige Browser-Telemetrie bereit. Zulässige Metriknamen und Labels begrenzen die Kardinalität. Bereitstellungen können das Ziel austauschen, ohne Routen oder Gateways an einen Telemetrieanbieter zu koppeln.

### Verwendungsbeispiele

`observability:metrics` über `ctx.capabilities` für Servermetriken auflösen oder zugelassene Browsertelemetrie an den Gateway-Endpunkt senden.

## Sicherheit

POST /api/v1/observability/client benötigt eine Benutzersitzung. Namen und Schlüssellabel sind erlaubt vorgegeben, Werte auf achtzig Zeichen begrenzt; pro Konto gelten sechs Anfragen je Minute.

## Referenz

### Technische Spezifikation

Metriknamen und Beschriftungen stehen auf Zulassungslisten, Browsernutzdaten werden stichprobenartig und größenbegrenzt verarbeitet, und das Ziel bleibt über den Capability-Vertrag herstellerneutral und austauschbar.
