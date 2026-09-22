<!-- Keep all src/docs/versions.*.md language variants in sync when updating this file. -->

# Komponentenversionen

## Überblick

Dieses Dokument erfasst die aktuelle Version jedes Gateways, Adapters und Moduls in der Cognis-Codebasis. Es dient als Changelog-Index und als schnelle Referenz, um zu erkennen, ob eine Komponente seit einer früheren Veröffentlichung aktualisiert wurde.

Jedes Gateway, jeder Adapter und jedes Modul besitzt eine `package.json` mit einem `version`-Feld. Wenn Sie eine Komponente ändern — einschließlich interner Logik, Datenbankschema, öffentlicher API oder Konfigurationsformat — müssen Sie die Version in dieser `package.json` nach Semantic Versioning erhöhen. Dieses Dokument wird gleichzeitig aktualisiert. Changelog-Einträge werden als PR-spezifische Dateien unter `src/docs/changelog/` gespeichert.

## Verantwortlichkeiten

- Die aktuelle Version jeder versionierten Komponente in der Codebasis festhalten.
- Als Changelog-Index dienen: Verweise auf komponentenspezifische Dokumentation und `src/docs/changelog/` für die Historie.
- Versionsdrift zwischen bereitgestellten Komponenten und der aktuellen Codebasis leicht erkennbar machen.

Nicht verantwortlich für: das Erzwingen von Versionserhöhungen (das ist Aufgabe des Code-Reviews) oder das Nachverfolgen externer Paketversionen.

## Versionierungsregel

Erhöhungen erfolgen nach [Semantic Versioning](https://semver.org/):

- **Patch** (`0.1.x`): Fehlerbehebungen, nicht brechende interne Änderungen.
- **Minor** (`0.x.0`): neue rückwärtskompatible Funktionen oder API-Erweiterungen.
- **Major** (`x.0.0`): brechende Änderungen an öffentlicher API oder Schema der Komponente.

## Abhängigkeitsregel

Interne Cognis-Komponentenabhängigkeiten verwenden Bereiche der Form `<=<tested-version>`. Dadurch wird die neueste getestete Abhängigkeitsversion festgehalten, während die Administrations-Lebenszyklusansicht warnen kann, wenn eine neuere installierte Abhängigkeit möglicherweise nicht verifiziert ist.

## Adapter

| Komponente            | Pfad                                | Version  |
| --------------------- | ----------------------------------- | -------- |
| SMTP Notification     | `src/adapters/notify/smtp/`         | `0.2.36` |
| Internal Notification | `src/adapters/notify/internal/`     | `0.5.30` |
| Local File Storage    | `src/adapters/file/local/`          | `0.1.25` |
| File Quota            | `src/adapters/file/quota/`          | `1.0.23` |
| Local Auth            | `src/adapters/auth/local/`          | `0.3.30` |
| User Keyring          | `src/adapters/auth/keyring/`        | `1.0.51` |
| LDAP Auth             | `src/adapters/auth/ldap/`           | `0.5.37` |
| OIDC Auth             | `src/adapters/auth/oidc/`           | `0.1.23` |
| SAML Auth             | `src/adapters/auth/saml/`           | `0.1.23` |
| SMTP TFA              | `src/adapters/tfa/smtp/`            | `1.0.37` |
| TOTP TFA              | `src/adapters/tfa/totp/`            | `1.0.26` |
| PostgreSQL Database   | `src/adapters/db/postgres/`         | `0.5.25` |
| MariaDB Database      | `src/adapters/db/mariadb/`          | `0.5.31` |
| SQLite Database       | `src/adapters/db/sqlite/`           | `0.3.27` |
| Memory Database       | `src/adapters/db/memory/`           | `0.1.24` |
| Registration Token    | `src/adapters/registration/token/`  | `0.1.38` |
| Public Registration   | `src/adapters/registration/public/` | `0.1.22` |
| Profile (Social)      | `src/adapters/social/profile/`      | `2.0.13` |
| Messages (Social)     | `src/adapters/social/messages/`     | `2.7.19` |
| Calls (Social)        | `src/adapters/social/call/`         | `0.5.34` |
| Link Share            | `src/adapters/share/link/`          | `1.1.36` |
| User Share            | `src/adapters/share/user/`          | `1.1.19` |
| Classes (Study)       | `src/adapters/study/classes/`       | `1.3.11` |
| Library (Study)       | `src/adapters/study/library/`       | `2.10.8` |
| Progress (Study)      | `src/adapters/study/progress/`      | `1.1.7`  |
| Leaderboard (Study)   | `src/adapters/study/leaderboard/`   | `1.1.5`  |
| Console Logging       | `src/adapters/logging/console/`     | `1.1.4`  |
| File Logging          | `src/adapters/logging/file/`        | `1.1.5`  |

## Gateways

| Komponente            | Pfad                          | Version   |
| --------------------- | ----------------------------- | --------- |
| Database (db)         | `src/gateways/db/`            | `1.3.9`   |
| Authentication (auth) | `src/gateways/auth/`          | `1.9.69`  |
| Share                 | `src/gateways/share/`         | `1.7.48`  |
| Two-Factor (tfa)      | `src/gateways/tfa/`           | `1.1.20`  |
| Notification (notify) | `src/gateways/notify/`        | `1.5.13`  |
| Social                | `src/gateways/social/`        | `1.3.6`   |
| File Storage (files)  | `src/gateways/files/`         | `2.2.0`   |
| Registration          | `src/gateways/registration/`  | `1.1.39`  |
| Logging               | `src/gateways/logging/`       | `1.5.14`  |
| Observability         | `src/gateways/observability/` | `1.0.7`   |
| Study                 | `src/gateways/study/`         | `1.8.23`  |
| Calendar              | `src/gateways/calendar/`      | `1.4.115` |

## Kernverträge

| Komponente   | Pfad        | Version   |
| ------------ | ----------- | --------- |
| Core Package | `src/core/` | `0.3.112` |

## API

| Komponente | Pfad       | Version |
| ---------- | ---------- | ------- |
| API Server | `src/api/` | `0.6.8` |

## Werkzeuge

| Komponente | Pfad               | Version |
| ---------- | ------------------ | ------- |
| Cognis CLI | `src/tooling/cli/` | `0.2.5` |
