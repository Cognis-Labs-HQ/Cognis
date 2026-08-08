# Zuverlässige SPA-Telemetrie

## Authentifizierung folgt Tokenwechseln

Die Browser-Leistungstelemetrie verwendet jetzt den Client des Observability-Gateways und wiederholt eine Anfrage einmal, wenn währenddessen das Zugriffstoken ersetzt wird. Dadurch werden unbeabsichtigte 401-Antworten bei der SPA-Navigation vermieden.

## Telemetrie nutzt eine UI-Fähigkeit

Die Browser-Leistungstelemetrie löst Übermittlungen jetzt über die registrierte UI-Fähigkeit des Observability-Gateways auf, sodass die gemeinsame Benutzeroberfläche von Gateway-Implementierungsdetails unabhängig bleibt.
