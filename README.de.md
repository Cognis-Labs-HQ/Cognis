# Cognis

Cognis ist eine API-first, modular aufgebaute Sprachlernplattform mit leichten Social-Networking-Funktionen.

## Aktueller Aufbau

- `core/`: Verträge, Gateway-Schnittstellen und Kernservices.
- `api/`: `/api/v1`-Routen-Grundgerüst für Domänenabsicht und Docs-Endpunkte.
- `adapters/`: Backend-spezifische Gateway-Implementierungen.
- `ui/`: Frontend-App für Lernen, Dokumentation, Administration und Benutzereinstellungen.
- `modules/`: Stammverzeichnis für Compile-Time-Module.
- `tooling/cli/`: Platzhalter-Tool `cognisctl`.
- `docs/components/`: zentrale Komponentendokumentation, über die UI via API nutzbar.

## Designprinzip

API-Handler definieren, **was** zu tun ist. Gateways/Adapter entscheiden, **wie** backend-spezifisches Verhalten umgesetzt wird.

## CI/CD

- GitHub Actions:
    - CI-Tests bei Push/Pull Request.
    - Docker-Build+Push bei Release-Veröffentlichung oder manuellem Dispatch nach `ghcr.io/<owner>/cognis`.
- GitLab CI:
    - Tests bei Branch- und Tag-Commits.
    - Docker-Build+Push bei Tags oder manuellen Läufen nach `registry.gitlab.firehawk-systems.com/firehawk/cognis`.

## Container-Orchestrierung

- `docker-compose.postgres.yaml` und `docker-compose.mariadb.yaml`: Compose-Definitionen für PostgreSQL und MariaDB.
- Führen Sie `./setup.sh` aus, um PostgreSQL oder MariaDB auszuwählen und die lokale Laufzeitumgebung interaktiv einzurichten.

## AI-Hinweise

- KI-spezifische Beitrags-Hinweise liegen in `AI_GUIDELINES.md` (getrennt von Produkt-/Nutzerdokumentation).

## CLI

- Nutze `tooling/cli/src/index.ts` (`cognisctl`) als operativen Einstiegspunkt.
- Konfiguriere das API-Ziel mit `COGNIS_API_URL` (Standard `http://localhost:3000`).
- Benutzerlebenszyklus-Befehle sind unter `user:*` gruppiert (inklusive `user:preferences:clear`).
- Module können Unterbefehle über `modules/<moduleId>/cli/index.js` bereitstellen.
- In Docker-Image-Shells ist `cognisctl` direkt im PATH verfügbar.
