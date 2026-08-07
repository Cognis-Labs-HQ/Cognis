# DevOps

## Überblick

Cognis liefert ein Node-22-Anwendungs-Image aus und kombiniert es mit dem unveränderten Image `nginx:stable-alpine`. Die CI/CD-Pipeline deckt automatisierte Tests bei jedem Push oder Pull Request und automatische Image-Lieferung an eine Container-Registry bei Releases ab.

Das Anwendungs-Image installiert Produktionsabhängigkeiten, läuft als nicht-root Benutzer `cognis` und exponiert einen internen Port. Compose stellt generisches nginx mit einer eingebundenen nativen Konfigurationsvorlage davor.

## Verantwortlichkeiten

- Ein lauffähiges, nicht-root Node-22-Anwendungs-Image aus dem Repository-Quellcode erstellen.
- Installation, Typprüfung und Tests bei jedem Push und Pull Request ausführen (CI).
- Das Anwendungs-Image bei Release an eine Container-Registry bauen und pushen (CD).
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

Ausführbare Standardwerte verbleiben im Anwendungs-Image, während sensible Werte wie `DATABASE_URL` und `DATA_ENCRYPTION_KEY` von der Bereitstellungsumgebung geliefert werden müssen. Der Anwendungseinstieg protokolliert Fehler der Datenbankkonfiguration und kann `DATABASE_URL` aus providerspezifischen Feldern erzeugen, bevor Cognis ausgeführt wird. Compose reicht sensible Werte über die native Umgebungsinterpolation weiter.

Das Web-Profil verwendet das unveränderte Image `nginx:stable-alpine` und bindet `docker/cognis-web/default.conf.template` in das native Vorlagenverzeichnis von nginx ein. Caching und Proxy-Header benötigen weder ein eigenes Web-Image noch einen eigenen Einstieg. Bereitstellungen können für TLS eine eigene native nginx-Konfiguration einbinden; Kubernetes-Ingress-Controller und externe Proxys können TLS ohne Änderungen am Cognis-Image terminieren.

```sh
docker compose up --build
```

### GitHub Actions

**`ci.yml`** — Läuft bei jedem Push und Pull Request.

**`docker.yml`** — Läuft bei Release-Veröffentlichung oder manuellem Dispatch.

## Konfiguration

| Variable               | Standard          | Beschreibung                                                       |
| ---------------------- | ----------------- | ------------------------------------------------------------------ |
| `DB_TYPE`              | `postgresql`      | Datenbank-Backend: `postgresql` oder `mariadb`                     |
| `DATABASE_URL`         | —                 | Datenbankverbindungs-URL; für den gewählten Provider überschreiben |
| `LOG_LEVEL`            | `info`            | Ausführlichkeit des Laufzeit-Logstreams                            |
| `LOG_ROTATE_MAX_BYTES` | `10485760`        | Rotiert die aktive Logdatei ab dieser Größe (Bytes)                |
| `LOG_ROTATE_MAX_FILES` | `10`              | Anzahl der aufzubewahrenden rotierten Logarchive                   |
| `LOG_ROTATE_COMPRESS`  | `true`            | Komprimiert rotierte Logs als gzip (`.gz`)                         |
| `PORT`                 | `3000`            | HTTP-Port                                                          |
| `HOST`                 | —                 | Erforderlicher interner Service-Hostname                           |
| `EXTERNAL_HOST`        | —                 | Erforderliche öffentlich erreichbare URL                           |
| `CONTACT_EMAIL`        | `admin@localhost` | Öffentliche Kontaktadresse                                         |
| `COGNIS_SMTP_HOST`     | —                 | SMTP-Server-Hostname                                               |

Anwendungsstandardwerte sind in `docker/Dockerfile` deklariert; das nginx-Proxyverhalten steht in `docker/cognis-web/default.conf.template`.
