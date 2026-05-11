# Cognis Dokumentationsindex

## Überblick

Dies ist das Root-Navigationsdokument für die Cognis-Entwicklerdokumentation. Alle Dokumente in diesem Set werden durch den In-App-Dokumentationsbrowser unter `/docs` und via `GET /api/v1/docs` bereitgestellt.

Diese Dokumente sind für Entwickler-Mitwirkende geschrieben, nicht für Endbenutzer. Wenn Sie neu in der Codebase sind, beginnen Sie mit den Übersichts- und Plattform-Features-Dokumenten.

## Inhaltsverzeichnis

### Plattform

| Dokument                                   | Beschreibung                                            |
| ------------------------------------------ | ------------------------------------------------------- |
| [Übersicht](./overview.en.md)              | Was Cognis ist und wie die Schichten zusammenpassen     |
| [Plattform-Features](./features.de.md)     | Eingebaute Fähigkeiten und Adapter-Abdeckung            |
| [Dokumentationsstandard](./standard.en.md) | Wie Dokumentation in dieser Codebase geschrieben wird   |
| [ACL-Matrix](./acl-matrix.de.md)           | Rollendefinitionen und vollständige Berechtigungsmatrix |
| [Komponentenversionen](./versions.de.md)   | Aktuelle Versionen aller Gateways, Adapter und Module   |

### Architekturschichten

| Dokument                     | Beschreibung                                                   |
| ---------------------------- | -------------------------------------------------------------- |
| [Core](./core.en.md)         | Contracts, Schnittstellen und Policy-Services                  |
| [API](./api.de.md)           | HTTP-Server, Route-Gruppen, Auth-Modell                        |
| [UI](./ui.de.md)             | Browser-Frontend: Seiten, Layouts, i18n                        |
| [Adapter](./adapters.de.md)  | Plattformweite Übersicht der Adapters-Schicht                  |
| [Gateways](./gateways.de.md) | Gateways und Adapter erstellen; Startreihenfolge; Capabilities |
| [DevOps](./devops.de.md)     | Dockerfile, GitHub Actions, Umgebungsvariablen                 |

### Gateways

| Dokument                                                 | Beschreibung                                   |
| -------------------------------------------------------- | ---------------------------------------------- |
| [Auth-Gateway](../gateways/auth/docs/index.de.md)        | Authentifizierungsanbieter, Token-Ausstellung  |
| [Datenbank-Gateway](../gateways/db/docs/index.de.md)     | Datenbankzugriff, Executor, Dialekt-Helfer     |
| [Dateien-Gateway](../gateways/files/docs/index.de.md)    | Lokale Dateispeicher-Capabilities              |
| [Logging-Gateway](../gateways/logging/docs/index.de.md)  | Strukturiertes Logging                         |
| [Notify-Gateway](../gateways/notify/docs/index.de.md)    | Pluggbarer Benachrichtigungsversand            |
| [Social-Gateway](../gateways/social/docs/standard.en.md) | Profile, sozialer Graph, Beiträge, Nachrichten |
