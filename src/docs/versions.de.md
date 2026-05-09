# Komponentenversionen

## Überblick

Dieses Dokument verfolgt die aktuelle Version jedes Gateways, Adapters und Moduls in der Cognis-Codebase. Es dient als Changelog-Index und schnelle Referenz.

Jedes Gateway, jeder Adapter und jedes Modul trägt eine `package.json` mit einem `version`-Feld. Wenn Sie eine Komponente modifizieren, müssen Sie die Version in dieser `package.json` nach Semantic Versioning erhöhen.

## Adapter

| Komponente                | Pfad                                | Version |
| ------------------------- | ----------------------------------- | ------- |
| SMTP-Benachrichtigung     | `src/adapters/notify/smtp/`         | `0.1.0` |
| Interne Benachrichtigung  | `src/adapters/notify/internal/`     | `0.3.0` |
| Lokaler Dateispeicher     | `src/adapters/file/local/`          | `0.1.0` |
| Lokale Auth               | `src/adapters/auth/local/`          | `0.2.2` |
| SQLite-Datenbank          | `src/adapters/db/sqlite/`           | `0.1.0` |
| PostgreSQL-Datenbank      | `src/adapters/db/postgres/`         | `0.1.0` |
| MariaDB-Datenbank         | `src/adapters/db/mariadb/`          | `0.1.0` |
| Registrierungs-Einladung  | `src/adapters/registration/invite/` | `0.1.1` |
| Registrierungs-Token      | `src/adapters/registration/token/`  | `0.1.1` |
| Öffentliche Registrierung | `src/adapters/registration/public/` | `0.1.0` |

## Gateways

| Komponente                | Pfad                         | Version |
| ------------------------- | ---------------------------- | ------- |
| Datenbank (db)            | `src/gateways/db/`           | `1.1.2` |
| Authentifizierung (auth)  | `src/gateways/auth/`         | `1.3.2` |
| Benachrichtigung (notify) | `src/gateways/notify/`       | `1.1.1` |
| Profil                    | `src/gateways/profile/`      | `1.1.1` |
| Dateispeicher (files)     | `src/gateways/files/`        | `1.1.0` |
| Registrierung             | `src/gateways/registration/` | `1.1.2` |
| Logging                   | `src/gateways/logging/`      | `1.4.0` |

## Core

| Komponente | Pfad        | Version |
| ---------- | ----------- | ------- |
| Core-Paket | `src/core/` | `0.1.0` |

## API

| Komponente | Pfad       | Version |
| ---------- | ---------- | ------- |
| API-Server | `src/api/` | `0.1.3` |

## Module

| Komponente       | Pfad                            | Version |
| ---------------- | ------------------------------- | ------- |
| Sample Analytics | `src/modules/sample-analytics/` | `0.1.0` |
