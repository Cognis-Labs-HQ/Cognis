# DevOps

## Überblick

Cognis wird als einzelnes Docker-Image ausgeliefert, das auf Node 22 basiert. Die CI/CD-Pipeline deckt automatisierte Tests bei jedem Push oder Pull Request und automatische Image-Lieferung an eine Container-Registry bei Releases ab.

Das Image ist absichtlich minimal: Es installiert nur Produktionsabhängigkeiten, läuft als nicht-root `cognis`-Benutzer und exponiert einen einzigen Port.

## Verantwortlichkeiten

- Ein lauffähiges, nicht-root Node 22 Docker-Image aus dem Repository-Quellcode erstellen.
- Installation, Typprüfung und Tests bei jedem Push und Pull Request ausführen (CI).
- Das Image bei Release an eine Container-Registry bauen und pushen (CD).
- `docker-compose.yaml` für die lokale Entwicklung mit einer PostgreSQL-Datenbank bereitstellen.

## Architektur

### Dockerfile

Das Dockerfile unter `docker/Dockerfile` verwendet eine einzelne `FROM node:22`-Stage:

- Erstellt einen nicht-root `cognis`-System-Benutzer und -Gruppe.
- Erstellt Laufzeit-Verzeichnisse mit korrekten Besitzrechten.
- Kopiert `docker/cognisctl`, `docker/entrypoint.sh` und `docker/healthcheck.sh`.
- Installiert Abhängigkeiten mit `npm ci --ignore-scripts` als nicht-root-Benutzer.
- Exponiert Port `3000`.

```dockerfile
EXPOSE 3000
ENV NODE_ENV=production
ENV DB_TYPE=postgresql
CMD ["node", "--import", "tsx", "/app/src/api/main.ts"]
```

### GitHub Actions

**`ci.yml`** — Läuft bei jedem Push und Pull Request.

**`docker.yml`** — Läuft bei Release-Veröffentlichung oder manuellem Dispatch.

## Konfiguration

| Variable           | Standard     | Beschreibung                                        |
| ------------------ | ------------ | --------------------------------------------------- |
| `DB_TYPE`          | `postgresql` | Datenbank-Backend: `postgresql` oder `mariadb`      |
| `DATABASE_URL`     | —            | Verbindungszeichenkette für PostgreSQL oder MariaDB |
| `LOG_LEVEL`        | `info`       | Basis-Schweregradfilter für `/api/v1/logging/stream` |
| `LOG_ROTATE_MAX_BYTES` | `10485760` | Rotiert die aktive Logdatei ab dieser Größe (Bytes) |
| `LOG_ROTATE_MAX_FILES` | `10`       | Anzahl der aufzubewahrenden rotierten Logarchive     |
| `LOG_ROTATE_COMPRESS`  | `true`     | Komprimiert rotierte Logs als gzip (`.gz`)           |
| `PORT`             | `3000`       | HTTP-Port                                           |
| `COGNIS_SMTP_HOST` | —            | SMTP-Server-Hostname                                |
