# Zuverlässige SPA-Telemetrie

**Feature Branch:** feature-fix-intermittent-401-error-in-spa

## Authentifizierung folgt Tokenwechseln

Die Browser-Leistungstelemetrie verwendet jetzt den Client des Observability-Gateways und wiederholt eine Anfrage einmal, wenn währenddessen das Zugriffstoken ersetzt wird. Dadurch werden unbeabsichtigte 401-Antworten bei der SPA-Navigation vermieden.

## Telemetrie nutzt eine UI-Fähigkeit

Die Browser-Leistungstelemetrie löst Übermittlungen jetzt über die registrierte UI-Fähigkeit des Observability-Gateways auf, sodass die gemeinsame Benutzeroberfläche von Gateway-Implementierungsdetails unabhängig bleibt.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/55815c3e03a8498211a2619ef9e4ee61895461a5
