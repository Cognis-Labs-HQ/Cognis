# Komponentenversionen

## Überblick

Dieses Dokument verfolgt die aktuelle Version jedes Gateways, Adapters und Moduls in der Cognis-Codebase. Es dient als Changelog-Index und schnelle Referenz.

Jedes Gateway, jeder Adapter und jedes Modul trägt eine `package.json` mit einem `version`-Feld. Wenn Sie eine Komponente modifizieren, müssen Sie die Version in dieser `package.json` nach Semantic Versioning erhöhen. Changelog-Einträge werden als PR-spezifische Dateien unter `src/docs/changelog/` gespeichert.

## Adapter

| Komponente                | Pfad                                | Version |
| ------------------------- | ----------------------------------- | ------- |
| SMTP-Benachrichtigung     | `src/adapters/notify/smtp/`         | `0.1.0` |
| Interne Benachrichtigung  | `src/adapters/notify/internal/`     | `0.5.2` |
| Lokaler Dateispeicher     | `src/adapters/file/local/`          | `0.1.0` |
| Lokale Auth               | `src/adapters/auth/local/`          | `0.2.5` |
| LDAP-Auth                 | `src/adapters/auth/ldap/`           | `0.1.3` |
| OIDC-Auth                 | `src/adapters/auth/oidc/`           | `0.1.1` |
| SAML-Auth                 | `src/adapters/auth/saml/`           | `0.1.1` |
| PostgreSQL-Datenbank      | `src/adapters/db/postgres/`         | `0.1.0` |
| MariaDB-Datenbank         | `src/adapters/db/mariadb/`          | `0.1.0` |
| Registrierungs-Einladung  | `src/adapters/registration/invite/` | `0.1.1` |
| Registrierungs-Token      | `src/adapters/registration/token/`  | `0.1.1` |
| Öffentliche Registrierung | `src/adapters/registration/public/` | `0.1.0` |
| Profil (Social)           | `src/adapters/social/profile/`      | `1.0.6` |
| Nachrichten (Social)      | `src/adapters/social/messages/`     | `1.4.4` |

## Gateways

| Komponente                | Pfad                         | Version |
| ------------------------- | ---------------------------- | ------- |
| Datenbank (db)            | `src/gateways/db/`           | `1.1.2` |
| Authentifizierung (auth)  | `src/gateways/auth/`         | `1.4.8` |
| Benachrichtigung (notify) | `src/gateways/notify/`       | `1.1.1` |
| Social                    | `src/gateways/social/`       | `1.2.0` |
| Dateispeicher (files)     | `src/gateways/files/`        | `1.1.0` |
| Registrierung             | `src/gateways/registration/` | `1.1.2` |
| Logging                   | `src/gateways/logging/`      | `1.4.0` |
| Kalender                  | `src/gateways/calendar/`     | `1.1.4` |

## Core

| Komponente | Pfad        | Version |
| ---------- | ----------- | ------- |
| Core-Paket | `src/core/` | `0.1.0` |

## API

| Komponente | Pfad       | Version |
| ---------- | ---------- | ------- |
| API-Server | `src/api/` | `0.1.3` |

## Module

| Komponente       | Pfad                              | Version |
| ---------------- | --------------------------------- | ------- |
| Analytik         | `src/modules/analytics/`          | `2.0.1` |
| Jitsi Meet       | `src/modules/jitsi-meet/`         | `1.0.0` |
| Cognis Japanisch | `src/modules/study/languages/ja/` | `1.2.4` |
| Cognis Englisch  | `src/modules/study/languages/en/` | `1.2.2` |
