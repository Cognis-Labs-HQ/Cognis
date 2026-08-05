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
| SMTP Notification     | `src/adapters/notify/smtp/`         | `0.2.14` |
| Internal Notification | `src/adapters/notify/internal/`     | `0.5.15` |
| Local File Storage    | `src/adapters/file/local/`          | `0.1.6`  |
| Dateikontingent       | `src/adapters/file/quota/`          | `1.0.4`  |
| Local Auth            | `src/adapters/auth/local/`          | `0.3.5`  |
| User Keyring          | `src/adapters/auth/keyring/`        | `1.0.26` |
| LDAP Auth             | `src/adapters/auth/ldap/`           | `0.5.7`  |
| OIDC Auth             | `src/adapters/auth/oidc/`           | `0.1.5`  |
| SAML Auth             | `src/adapters/auth/saml/`           | `0.1.5`  |
| SMTP TFA              | `src/adapters/tfa/smtp/`            | `1.0.15` |
| TOTP TFA              | `src/adapters/tfa/totp/`            | `1.0.8`  |
| PostgreSQL Database   | `src/adapters/db/postgres/`         | `0.5.2`  |
| MariaDB Database      | `src/adapters/db/mariadb/`          | `0.5.1`  |
| SQLite Database       | `src/adapters/db/sqlite/`           | `0.3.7`  |
| Memory Database       | `src/adapters/db/memory/`           | `0.1.5`  |
| Registration Invite   | `src/adapters/registration/invite/` | `0.1.7`  |
| Registration Token    | `src/adapters/registration/token/`  | `0.1.6`  |
| Public Registration   | `src/adapters/registration/public/` | `0.1.4`  |
| Profile (Social)      | `src/adapters/social/profile/`      | `1.1.28` |
| Messages (Social)     | `src/adapters/social/messages/`     | `2.0.32` |
| Link Share            | `src/adapters/share/link/`          | `1.1.10` |
| User Share            | `src/adapters/share/user/`          | `1.1.11` |
| Classes (Study)       | `src/adapters/study/classes/`       | `1.3.8`  |
| Japanese (Study)      | `src/adapters/study/japanese/`      | `1.0.0`  |
| Console Logging       | `src/adapters/logging/console/`     | `1.0.0`  |
| File Logging          | `src/adapters/logging/file/`        | `1.0.0`  |

## Gateways

| Komponente            | Pfad                          | Version  |
| --------------------- | ----------------------------- | -------- |
| Database (db)         | `src/gateways/db/`            | `1.3.6`  |
| Authentication (auth) | `src/gateways/auth/`          | `1.7.41` |
| Share                 | `src/gateways/share/`         | `1.6.44` |
| Two-Factor (tfa)      | `src/gateways/tfa/`           | `1.1.12` |
| Notification (notify) | `src/gateways/notify/`        | `1.5.3`  |
| Social                | `src/gateways/social/`        | `1.2.10` |
| File Storage (files)  | `src/gateways/files/`         | `2.1.4`  |
| Registration          | `src/gateways/registration/`  | `1.1.12` |
| Logging               | `src/gateways/logging/`       | `1.5.3`  |
| Observability         | `src/gateways/observability/` | `1.0.0`  |
| Study                 | `src/gateways/study/`         | `1.5.9`  |
| Calendar              | `src/gateways/calendar/`      | `1.4.47` |

## Kernverträge

| Komponente   | Pfad        | Version |
| ------------ | ----------- | ------- |
| Core Package | `src/core/` | `0.3.5` |

## API

| Komponente | Pfad       | Version |
| ---------- | ---------- | ------- |
| API Server | `src/api/` | `0.2.3` |

## Module

| Komponente           | Pfad                                | Version  |
| -------------------- | ----------------------------------- | -------- |
| Analytics            | `src/modules/analytics/`            | `2.0.4`  |
| Jitsi Meet           | `src/modules/jitsi-meet/`           | `1.3.54` |
| Nextcloud Whiteboard | `src/modules/nextcloud-whiteboard/` | `2.2.30` |
| Cognis Japanese      | `src/modules/study/languages/ja/`   | `1.2.6`  |
| Cognis English       | `src/modules/study/languages/en/`   | `1.2.4`  |
