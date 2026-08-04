# DevOps

## Überblick

Cognis wird als einzelnes Docker-Image ausgeliefert, das auf Node 22 basiert. Die CI/CD-Pipeline deckt automatisierte Tests bei jedem Push oder Pull Request und automatische Image-Lieferung an eine Container-Registry bei Releases ab.

Das Image ist absichtlich minimal: Es installiert nur Produktionsabhängigkeiten, läuft als nicht-root `cognis`-Benutzer und exponiert einen einzigen Port.

## Verantwortlichkeiten

- Ein lauffähiges, nicht-root Node 22 Docker-Image aus dem Repository-Quellcode erstellen.
- Installation, Typprüfung und Tests bei jedem Push und Pull Request ausführen (CI).
- Das Image bei Release an eine Container-Registry bauen und pushen (CD).
- Datenbankspezifische Produktions- und Entwicklungs-Compose-Dateien für PostgreSQL und MariaDB bereitstellen.

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
CMD ["node", "src/api/main.js"]
```

### Umgebungsprofile

Docker-Standardwerte liegen außerhalb des Images in `docker/env/default.env`, das mit der `.env` im Repository-Stamm verknüpft ist. PostgreSQL und MariaDB besitzen getrennte Treiber-, Entwicklungs- und Produktions-Env-Dateien. Compose lädt diese Dateien in den Container; der Entrypoint verlangt Host, Port, Datenbank, Benutzername und Passwort des ausgewählten Systems, bevor er daraus `DATABASE_URL` erstellt. In der Produktion ist zusätzlich `DATA_ENCRYPTION_KEY` erforderlich. Die Produktionsdateien mit Geheimnissen werden von Git ignoriert; kopieren Sie die versionierten `.example`-Vorlagen und bearbeiten Sie die Kopien. Fehlermeldungen nennen die genaue Datei für den fehlenden Wert. Compose importiert jede Env-Datei über einen ausdrücklichen, repository-relativen Pfad `./docker/env/...`, sodass bei Symlinks im Arbeitsverzeichnis kein hostspezifischer absoluter Checkout-Pfad vorausgesetzt wird.

```sh
cp docker/env/production.env.example docker/env/production.env
cp docker/env/postgres-production.env.example docker/env/postgres-production.env
cp docker/env/mariadb-production.env.example docker/env/mariadb-production.env
docker compose -f docker-compose.postgres.yaml up
docker compose -f docker-compose.mariadb.yaml up
docker compose -f docker-compose.postgres.dev.yaml up
docker compose -f docker-compose.mariadb.dev.yaml up
```

### GitHub Actions

**`ci.yml`** — Läuft bei jedem Push und Pull Request.

**`docker.yml`** — Läuft bei Release-Veröffentlichung oder manuellem Dispatch.

## Konfiguration

| Variable               | Standard     | Beschreibung                                                       |
| ---------------------- | ------------ | ------------------------------------------------------------------ |
| `DB_TYPE`              | `postgresql` | Datenbank-Backend: `postgresql` oder `mariadb`                     |
| `DATABASE_URL`         | —            | Wird vom Container-Entrypoint aus den Systemeinstellungen erstellt |
| `LOG_LEVEL`            | `info`       | Ausführlichkeit des Laufzeit-Logstreams                            |
| `LOG_ROTATE_MAX_BYTES` | `10485760`   | Rotiert die aktive Logdatei ab dieser Größe (Bytes)                |
| `LOG_ROTATE_MAX_FILES` | `10`         | Anzahl der aufzubewahrenden rotierten Logarchive                   |
| `LOG_ROTATE_COMPRESS`  | `true`       | Komprimiert rotierte Logs als gzip (`.gz`)                         |
| `PORT`                 | `3000`       | HTTP-Port                                                          |
| `COGNIS_SMTP_HOST`     | —            | SMTP-Server-Hostname                                               |

Die aktiven Docker-Standardwerte und Einrichtungsüberschreibungen stehen direkt in den Env-Dateien unter `docker/env/`.
