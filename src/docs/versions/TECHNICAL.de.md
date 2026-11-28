# Technische Referenz

Dieser Index erfasst ausgelieferte Komponentenversionen und erklärt getestete Abhängigkeitsgrenzen sowie die Auswahl der Dokumentversion.

## Schnittstellen

### API

| Komponente | Pfad       | Version   |
| ---------- | ---------- | --------- |
| API Server | `src/api/` | `0.13.42` |

## Konfiguration

Manifeste und package.json enthalten Versionen. Cognis-Abhängigkeiten nutzen getestete Obergrenzen wie <=1.2.3; das ist eine Warngrenze, keine Gleichwertigkeit aller älteren Funktionen.

## Verhalten

### Überblick

Dieses Dokument erfasst die aktuelle Version jedes Gateways, Adapters und Moduls in der Cognis-Codebasis. Es dient als Changelog-Index und als schnelle Referenz, um zu erkennen, ob eine Komponente seit einer früheren Veröffentlichung aktualisiert wurde.

Komponenten deklarieren eine `version` in `manifest.json`, `package.json` oder beiden Dateien; sind beide vorhanden, müssen sie übereinstimmen. Bei Änderungen an Implementierung, Datenbankschema, öffentlicher API oder Konfigurationsformat wird die Version der zuständigen Komponente nach Semantic Versioning erhöht. Dieser Index wird gleichzeitig aktualisiert. Veröffentlichungshinweise gehören in den einzigen lokalisierten Branch-Changelog-Satz unter `src/docs/changelog/`.

### Verantwortlichkeiten

- Die aktuelle Version jeder versionierten Komponente in der Codebasis festhalten.
- Als Changelog-Index dienen: Verweise auf komponentenspezifische Dokumentation und `src/docs/changelog/` für die Historie.
- Versionsdrift zwischen bereitgestellten Komponenten und der aktuellen Codebasis leicht erkennbar machen.

Nicht verantwortlich für: das Erzwingen von Versionserhöhungen (das ist Aufgabe des Code-Reviews) oder das Nachverfolgen externer Paketversionen.

### Abhängigkeitsregel

Interne Cognis-Komponentenabhängigkeiten verwenden Bereiche der Form `<=<tested-version>`. Dadurch wird die neueste getestete Abhängigkeitsversion festgehalten, während die Administrations-Lebenszyklusansicht warnen kann, wenn eine neuere installierte Abhängigkeit möglicherweise nicht verifiziert ist.

### Adapter

| Komponente            | Pfad                                | Version  |
| --------------------- | ----------------------------------- | -------- |
| SMTP Notification     | `src/adapters/notify/smtp/`         | `0.5.7`  |
| Internal Notification | `src/adapters/notify/internal/`     | `0.5.41` |
| Local File Storage    | `src/adapters/file/local/`          | `0.1.30` |
| File Quota            | `src/adapters/file/quota/`          | `1.0.28` |
| Local Auth            | `src/adapters/auth/local/`          | `0.4.5`  |
| User Keyring          | `src/adapters/auth/keyring/`        | `2.1.9`  |
| LDAP Auth             | `src/adapters/auth/ldap/`           | `0.5.41` |
| OIDC Auth             | `src/adapters/auth/oidc/`           | `0.1.27` |
| SAML Auth             | `src/adapters/auth/saml/`           | `0.1.27` |
| SMTP TFA              | `src/adapters/tfa/smtp/`            | `1.1.6`  |
| TOTP TFA              | `src/adapters/tfa/totp/`            | `1.0.31` |
| PostgreSQL Database   | `src/adapters/db/postgres/`         | `0.5.30` |
| MariaDB Database      | `src/adapters/db/mariadb/`          | `0.5.35` |
| SQLite Database       | `src/adapters/db/sqlite/`           | `0.3.30` |
| Memory Database       | `src/adapters/db/memory/`           | `0.1.27` |
| Registration Token    | `src/adapters/registration/token/`  | `0.1.44` |
| Public Registration   | `src/adapters/registration/public/` | `0.1.26` |
| Profile (Social)      | `src/adapters/social/profile/`      | `3.0.24` |
| Messages (Social)     | `src/adapters/social/messages/`     | `2.7.53` |
| Calls (Social)        | `src/adapters/social/call/`         | `0.5.40` |
| Link Share            | `src/adapters/share/link/`          | `1.1.45` |
| User Share            | `src/adapters/share/user/`          | `1.1.22` |
| Classes (Study)       | `src/adapters/study/classes/`       | `1.4.16` |
| Library (Study)       | `src/adapters/study/library/`       | `4.1.34` |
| Drawing (Study)       | `src/adapters/study/drawing/`       | `1.1.5`  |
| Lernkartenadapter     | `src/adapters/study/flashcards/`    | `1.5.37` |
| Progress (Study)      | `src/adapters/study/progress/`      | `1.3.6`  |
| Leaderboard (Study)   | `src/adapters/study/leaderboard/`   | `1.2.15` |
| Console Logging       | `src/adapters/logging/console/`     | `1.1.4`  |
| File Logging          | `src/adapters/logging/file/`        | `1.1.5`  |

### Gateways

| Komponente            | Pfad                          | Version  |
| --------------------- | ----------------------------- | -------- |
| Database (db)         | `src/gateways/db/`            | `1.4.4`  |
| Authentication (auth) | `src/gateways/auth/`          | `2.2.13` |
| Share                 | `src/gateways/share/`         | `1.9.16` |
| Two-Factor (tfa)      | `src/gateways/tfa/`           | `1.3.13` |
| Notification (notify) | `src/gateways/notify/`        | `2.2.15` |
| Social                | `src/gateways/social/`        | `1.4.9`  |
| File Storage (files)  | `src/gateways/files/`         | `2.3.10` |
| Registration          | `src/gateways/registration/`  | `1.2.12` |
| Logging               | `src/gateways/logging/`       | `1.5.26` |
| Observability         | `src/gateways/observability/` | `1.0.10` |
| Study                 | `src/gateways/study/`         | `2.6.18` |
| Calendar              | `src/gateways/calendar/`      | `1.7.31` |

### Kernverträge

| Komponente   | Pfad        | Version |
| ------------ | ----------- | ------- |
| Core Package | `src/core/` | `0.6.7` |

### Werkzeuge

| Komponente | Pfad               | Version |
| ---------- | ------------------ | ------- |
| Cognis CLI | `src/tooling/cli/` | `0.4.7` |

[c]: https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/core/package.json
[a]: https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/api/package.json
[m]: https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/social/messages/package.json
[p]: https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/social/profile/package.json

## Sicherheit

Version und getestete Grenze erlauben keine Aktivierung. Integrität, Abhängigkeiten und Hostschutz gelten auch beim Aktualisieren.

## Referenz

### Versionierungsregel

Erhöhungen erfolgen nach [Semantic Versioning](https://semver.org/):

- **Patch** (`0.1.x`): Fehlerbehebungen, nicht brechende interne Änderungen.
- **Minor** (`0.x.0`): neue rückwärtskompatible Funktionen oder API-Erweiterungen.
- **Major** (`x.0.0`): brechende Änderungen an öffentlicher API oder Schema der Komponente.
