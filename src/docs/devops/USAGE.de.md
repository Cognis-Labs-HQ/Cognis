# Anwendung

Praktische Abläufe für DevOps.

## Voraussetzungen

Bereite Docker Compose, Datenbankzugang und Verschlüsselungsschlüssel vor.

## Beispiele

Setze POSTGRES_PASSWORD und DATA_ENCRYPTION_KEY, starte `docker compose up --build` und prüfe Gesundheit und Protokolle.

```sh
export POSTGRES_PASSWORD='<Datenbankkennwort>'
export DATA_ENCRYPTION_KEY='<64-stelliger Verschlüsselungsschlüssel>'
docker compose up --build
```

## Erwartete Ergebnisse

Die Anwendung startet hinter nginx mit der Datenbank; fehlende Pflichtgeheimnisse verhindern den Start.

## Fehlerbehebung

Prüfe Compose-Fehler, Datenbank und Verzeichnisrechte. Sichere vor Updates Datenbank und Medien gemeinsam.
