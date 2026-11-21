# Anwendung

Praktische Abläufe für DevOps.

## Voraussetzungen

Beachten Sie vor dem Ausführen [die Zugriffsanforderungen](/docs/devops).

## Beispiele

```sh
export POSTGRES_PASSWORD='<Datenbankkennwort>'
export DATA_ENCRYPTION_KEY='<64-stelliger Verschlüsselungsschlüssel>'
docker compose up --build
```

## Erwartete Ergebnisse

Das Beispiel verwendet die dokumentierte Schnittstelle von DevOps. Prüfen Sie vor erneuten Schreibvorgängen die unter [Technik](/docs/devops/technical) beschriebene Antwort oder den gespeicherten Zustand.

## Fehlerbehebung

Falls DevOps nicht verfügbar ist, prüfen Sie Ihre Anmeldung und lassen Sie den Administrator die Komponente und ihre Abhängigkeiten kontrollieren.
