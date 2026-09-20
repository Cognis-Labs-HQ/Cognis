# Cognis Dokumentationsindex

## Überblick

Dies ist das Root-Navigationsdokument für die Cognis-Entwicklerdokumentation. Alle Dokumente in diesem Set werden durch den In-App-Dokumentationsbrowser unter `/docs` und via `GET /api/v1/docs` bereitgestellt.

Diese Dokumente sind für Entwickler-Mitwirkende geschrieben, nicht für Endbenutzer. Wenn Sie neu in der Codebase sind, beginnen Sie mit den Übersichts- und Plattform-Features-Dokumenten.

## Inhaltsverzeichnis

### Plattform

| Dokument                                 | Beschreibung                                            |
| ---------------------------------------- | ------------------------------------------------------- |
| [Übersicht](/docs/overview)              | Was Cognis ist und wie die Schichten zusammenpassen     |
| [Plattform-Features](/docs/features)     | Eingebaute Fähigkeiten und Adapter-Abdeckung            |
| [Dokumentationsstandard](/docs/standard) | Wie Dokumentation in dieser Codebase geschrieben wird   |
| [ACL-Matrix](/docs/acl-matrix)           | Rollendefinitionen und vollständige Berechtigungsmatrix |
| [Komponentenversionen](/docs/versions)   | Aktuelle Versionen aller Gateways, Adapter und Module   |

### Architekturschichten

| Dokument                   | Beschreibung                                                   |
| -------------------------- | -------------------------------------------------------------- |
| [Core](/docs/core)         | Contracts, Schnittstellen und Policy-Services                  |
| [API](/docs/api)           | HTTP-Server, Route-Gruppen, Auth-Modell                        |
| [UI](/docs/ui)             | Browser-Frontend: Seiten, Layouts, i18n                        |
| [Adapter](/docs/adapters)  | Plattformweite Übersicht der Adapters-Schicht                  |
| [Gateways](/docs/gateways) | Gateways und Adapter erstellen; Startreihenfolge; Capabilities |
| [DevOps](/docs/devops)     | Dockerfile, GitHub Actions, Umgebungsvariablen                 |

### Gateways

| Dokument                                         | Beschreibung                                   |
| ------------------------------------------------ | ---------------------------------------------- |
| [Auth-Gateway](/docs/gateways/auth)              | Authentifizierungsanbieter, Token-Ausstellung  |
| [Datenbank-Gateway](/docs/gateways/db)           | Datenbankzugriff, Executor, Dialekt-Helfer     |
| [Dateien-Gateway](/docs/gateways/files)          | Lokale Dateispeicher-Capabilities              |
| [Logging-Gateway](/docs/gateways/logging)        | Strukturiertes Logging                         |
| [Notify-Gateway](/docs/gateways/notify)          | Pluggbarer Benachrichtigungsversand            |
| [Social-Gateway](/docs/gateways/social/standard) | Profile, sozialer Graph, Beiträge, Nachrichten |
