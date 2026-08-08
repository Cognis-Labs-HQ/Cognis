# Zuverlässige SPA-Telemetrie

## Authentifizierung folgt Tokenwechseln

Die Browser-Leistungstelemetrie verwendet jetzt den Client des Observability-Gateways und wiederholt eine Anfrage einmal, wenn währenddessen das Zugriffstoken ersetzt wird. Dadurch werden unbeabsichtigte 401-Antworten bei der SPA-Navigation vermieden.
