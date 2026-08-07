# DevOps

## Überblick

Cognis wird als Node-22-Anwendungs-Image plus `cognis-web`-Nginx-Web-Image ausgeliefert. Die CI/CD-Pipeline deckt automatisierte Tests bei jedem Push oder Pull Request und automatische Image-Lieferung an eine Container-Registry bei Releases ab.

Das Anwendungs-Image ist absichtlich minimal: Es installiert nur Produktionsabhängigkeiten, läuft als nicht-root `cognis`-Benutzer und exponiert einen einzigen internen Port. Production Compose stellt das Web-Image `cognis-web` davor; GitLab CI veröffentlicht dasselbe Web-Artefakt als `$CI_REGISTRY_IMAGE/cognis-web:<ref>` und `:sha-<commit>`.

## Verantwortlichkeiten

- Ein lauffähiges, nicht-root Node-22-Anwendungs-Image aus dem Repository-Quellcode erstellen.
- Ein `cognis-web`-Web-Image aus `docker/cognis-web` für veröffentlichten TLS-Verkehr erstellen.
- Installation, Typprüfung und Tests bei jedem Push und Pull Request ausführen (CI).
- Das Anwendungs- und das `cognis-web`-Image bei Release an eine Container-Registry bauen und pushen (CD).
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

### Container-Standardwerte

Ausführbare Standardwerte sind direkt in den Anwendungs- und Web-Images enthalten. `docker compose up --build` startet den PostgreSQL-Stack ohne erzeugte Umgebungsdateien; für MariaDB verwenden Sie `docker compose -f docker-compose.mariadb.yaml up --build`. Bereitstellungen können die Image-Standardwerte über ihre normale Umgebungskonfiguration überschreiben. Der Anwendungseinstieg führt nur den konfigurierten Befehl aus.

Das Web-Image lauscht standardmäßig auf HTTP. HTTPS und die Umleitung von HTTP zu HTTPS werden zusätzlich aktiviert, wenn beide konfigurierten Zertifikatspfade vorhanden und lesbar sind. Eine TLS-Modusvariable ist nicht erforderlich.

```sh
docker compose up --build
```

### GitHub Actions

**`ci.yml`** — Läuft bei jedem Push und Pull Request.

**`docker.yml`** — Läuft bei Release-Veröffentlichung oder manuellem Dispatch.

## Konfiguration

| Variable                         | Standard                       | Beschreibung                                                               |
| -------------------------------- | ------------------------------ | -------------------------------------------------------------------------- |
| `DB_TYPE`                        | `postgresql`                   | Datenbank-Backend: `postgresql` oder `mariadb`                             |
| `DATABASE_URL`                   | —                              | Datenbankverbindungs-URL; für den gewählten Provider überschreiben         |
| `LOG_LEVEL`                      | `info`                         | Ausführlichkeit des Laufzeit-Logstreams                                    |
| `LOG_ROTATE_MAX_BYTES`           | `10485760`                     | Rotiert die aktive Logdatei ab dieser Größe (Bytes)                        |
| `LOG_ROTATE_MAX_FILES`           | `10`                           | Anzahl der aufzubewahrenden rotierten Logarchive                           |
| `LOG_ROTATE_COMPRESS`            | `true`                         | Komprimiert rotierte Logs als gzip (`.gz`)                                 |
| `PORT`                           | `3000`                         | HTTP-Port                                                                  |
| `COGNIS_WEB_TLS_CERTIFICATE`     | `/etc/nginx/tls/fullchain.pem` | Zertifikatspfad; lesbare Zertifikat- und Schlüsseldateien aktivieren HTTPS |
| `COGNIS_WEB_TLS_CERTIFICATE_KEY` | `/etc/nginx/tls/privkey.pem`   | Schlüsselpfad; lesbare Zertifikat- und Schlüsseldateien aktivieren HTTPS   |
| `HOST`                           | —                              | Erforderlicher interner Service-Hostname                                   |
| `EXTERNAL_HOST`                  | —                              | Erforderliche öffentlich erreichbare URL                                   |
| `CONTACT_EMAIL`                  | `admin@localhost`              | Öffentliche Kontaktadresse                                                 |
| `COGNIS_SMTP_HOST`               | —                              | SMTP-Server-Hostname                                                       |

Anwendungsstandardwerte sind in `docker/Dockerfile` deklariert; Web-Standardwerte stehen in `docker/cognis-web/Dockerfile`.
