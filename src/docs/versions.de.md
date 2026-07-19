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

| Komponente            | Pfad                                | Version |
| --------------------- | ----------------------------------- | ------- |
| SMTP Notification     | `src/adapters/notify/smtp/`         | `0.2.5` |
| Internal Notification | `src/adapters/notify/internal/`     | `0.5.6` |
| Local File Storage    | `src/adapters/file/local/`          | `0.1.3` |
| Local Auth            | `src/adapters/auth/local/`          | `0.2.6` |
| LDAP Auth             | `src/adapters/auth/ldap/`           | `0.1.5` |
| OIDC Auth             | `src/adapters/auth/oidc/`           | `0.1.2` |
| SAML Auth             | `src/adapters/auth/saml/`           | `0.1.2` |
| SMTP TFA              | `src/adapters/tfa/smtp/`            | `1.0.2` |
| TOTP TFA              | `src/adapters/tfa/totp/`            | `1.0.5` |
| PostgreSQL Database   | `src/adapters/db/postgres/`         | `0.4.2` |
| MariaDB Database      | `src/adapters/db/mariadb/`          | `0.4.2` |
| SQLite Database       | `src/adapters/db/sqlite/`           | `0.3.2` |
| Memory Database       | `src/adapters/db/memory/`           | `0.1.2` |
| Registration Invite   | `src/adapters/registration/invite/` | `0.1.3` |
| Registration Token    | `src/adapters/registration/token/`  | `0.1.2` |
| Public Registration   | `src/adapters/registration/public/` | `0.1.1` |
| Profile (Social)      | `src/adapters/social/profile/`      | `1.1.2` |
| Messages (Social)     | `src/adapters/social/messages/`     | `1.4.9` |
| Classes (Study)       | `src/adapters/study/classes/`       | `1.3.5` |
| Japanese (Study)      | `src/adapters/study/japanese/`      | `1.0.0` |

## Gateways

| Komponente            | Pfad                         | Version  |
| --------------------- | ---------------------------- | -------- |
| Database (db)         | `src/gateways/db/`           | `1.2.2`  |
| Authentication (auth) | `src/gateways/auth/`         | `1.5.0`  |
| Share                 | `src/gateways/share/`        | `1.3.2`  |
| Two-Factor (tfa)      | `src/gateways/tfa/`          | `1.1.5`  |
| Notification (notify) | `src/gateways/notify/`       | `1.4.11` |
| Social                | `src/gateways/social/`       | `1.2.7`  |
| File Storage (files)  | `src/gateways/files/`        | `2.1.2`  |
| Registration          | `src/gateways/registration/` | `1.1.10` |
| Logging               | `src/gateways/logging/`      | `1.5.2`  |
| Study                 | `src/gateways/study/`        | `1.5.7`  |
| Calendar              | `src/gateways/calendar/`     | `1.2.5`  |

## Kernverträge

| Komponente   | Pfad        | Version |
| ------------ | ----------- | ------- |
| Core Package | `src/core/` | `0.3.0` |

## API

| Komponente | Pfad       | Version  |
| ---------- | ---------- | -------- |
| API Server | `src/api/` | `0.1.10` |

## Module

| Komponente           | Pfad                                | Version  |
| -------------------- | ----------------------------------- | -------- |
| Analytik             | `src/modules/analytics/`            | `2.0.1`  |
| Jitsi Meet           | `src/modules/jitsi-meet/`           | `1.2.5`  |
| Nextcloud Whiteboard | `src/modules/nextcloud-whiteboard/` | `2.1.30` |
| Cognis Japanisch     | `src/modules/study/languages/ja/`   | `1.2.4`  |
| Cognis Englisch      | `src/modules/study/languages/en/`   | `1.2.2`  |
