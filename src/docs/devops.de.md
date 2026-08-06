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

### Umgebungsprofile

Docker-Standardwerte verbleiben in der versionierten Datei `docker/env/default.env`. `./setup.sh` schreibt Anwendungs- und Datenbankwerte in `docker/env/runtime.env` und ausschließlich Web-TLS-Einstellungen in `docker/env/cognis-web.env`. Compose stellt `cognis-web` nur die Web-Datei bereit, sodass der Container weder Cognis-Verschlüsselungsschlüssel noch Datenbankzugangsdaten lesen kann. Die Einrichtung fragt, ob ein separater Reverse Proxy oder CDN HTTPS vor `cognis-web` terminiert; Ja schreibt `COGNIS_WEB_TLS_MODE=deferred`, Nein behält lokale TLS-Terminierung mit `terminate` bei.

Env-Dateien sind eine Annehmlichkeit für Compose und keine Laufzeitanforderung. Orchestratoren wie Kubernetes können dieselben Werte direkt in den Container einspeisen. Sie können entweder `DB_TYPE` und die providerspezifischen Verbindungsvariablen oder direkt `DATABASE_URL` bereitstellen. Wenn `DB_TYPE` fehlt, leitet der Entrypoint den Typ aus einem PostgreSQL- oder MySQL/MariaDB-URL-Schema ab.

Wenn Traefik oder ein anderer Reverse-Proxy TLS beendet, muss sein Upstream
Port 80 von `cognis-web` über HTTP mit `COGNIS_WEB_TLS_MODE=deferred` verwenden.
Das Image veröffentlicht für die automatische Container-Diensterkennung nur
Port 80, damit ein Proxy nicht versehentlich den TLS-Listener auf Port 443
auswählt und HTTP 421 zurückgibt. Port 443 bleibt über die explizite
Compose-Veröffentlichung verfügbar, wenn `cognis-web` TLS selbst beendet.

```sh
./setup.sh
docker compose up --build
```

### GitHub Actions

**`ci.yml`** — Läuft bei jedem Push und Pull Request.

**`docker.yml`** — Läuft bei Release-Veröffentlichung oder manuellem Dispatch.

## Konfiguration

| Variable                         | Standard                       | Beschreibung                                                                                                         |
| -------------------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `DB_TYPE`                        | `postgresql`                   | Datenbank-Backend: `postgresql` oder `mariadb`                                                                       |
| `DATABASE_URL`                   | —                              | Wird vom Container-Entrypoint aus den Systemeinstellungen erstellt                                                   |
| `LOG_LEVEL`                      | `info`                         | Ausführlichkeit des Laufzeit-Logstreams                                                                              |
| `LOG_ROTATE_MAX_BYTES`           | `10485760`                     | Rotiert die aktive Logdatei ab dieser Größe (Bytes)                                                                  |
| `LOG_ROTATE_MAX_FILES`           | `10`                           | Anzahl der aufzubewahrenden rotierten Logarchive                                                                     |
| `LOG_ROTATE_COMPRESS`            | `true`                         | Komprimiert rotierte Logs als gzip (`.gz`)                                                                           |
| `PORT`                           | `3000`                         | HTTP-Port                                                                                                            |
| `COGNIS_WEB_TLS_MODE`            | `terminate`                    | Web-TLS-Modus: `terminate` für lokales HTTPS oder `deferred` für HTTP hinter einem vertrauenswürdigen TLS-Terminator |
| `COGNIS_WEB_TLS_CERTIFICATE`     | `/etc/nginx/tls/fullchain.pem` | Zertifikatspfad in `cognis-web`; nur im Modus `terminate` gelesen                                                    |
| `COGNIS_WEB_TLS_CERTIFICATE_KEY` | `/etc/nginx/tls/privkey.pem`   | Pfad zum privaten Schlüssel; nur im Modus `terminate` gelesen                                                        |
| `HOST`                           | —                              | Erforderlicher interner Service-Hostname                                                                             |
| `EXTERNAL_HOST`                  | —                              | Erforderliche öffentlich erreichbare URL                                                                             |
| `CONTACT_EMAIL`                  | —                              | Erforderliche öffentliche Kontaktadresse                                                                             |
| `COGNIS_SMTP_HOST`               | —                              | SMTP-Server-Hostname                                                                                                 |

Die aktiven Docker-Standardwerte und Einrichtungsüberschreibungen stehen direkt in den Env-Dateien unter `docker/env/`.
