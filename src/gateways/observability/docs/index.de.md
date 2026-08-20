# Observability-Gateway

Das Gateway stellt die herstellerneutrale ctx-Fähigkeit `observability:metrics` und einen größenbegrenzten Endpunkt für stichprobenartige Browser-Telemetrie bereit. Zulässige Metriknamen und Labels begrenzen die Kardinalität. Bereitstellungen können das Ziel austauschen, ohne Routen oder Gateways an einen Telemetrieanbieter zu koppeln.

## Verwendungsbeispiele

`observability:metrics` über `ctx.capabilities` für Servermetriken auflösen oder zugelassene Browsertelemetrie an den Gateway-Endpunkt senden.

## Technische Spezifikation

Metriknamen und Beschriftungen stehen auf Zulassungslisten, Browsernutzdaten werden stichprobenartig und größenbegrenzt verarbeitet, und das Ziel bleibt über den Capability-Vertrag herstellerneutral und austauschbar.
