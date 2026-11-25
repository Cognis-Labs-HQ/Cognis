# Technische Referenz

Diese Referenzen führen zur zuständigen Komponente, ihren öffentlichen Verträgen und ihren Bereitstellungsanforderungen.

## Schnittstellen

### Architekturschichten

| Dokument                   | Beschreibung                                                   |
| -------------------------- | -------------------------------------------------------------- |
| [Core](/docs/core)         | Contracts, Schnittstellen und Policy-Services                  |
| [API](/docs/api)           | HTTP-Server, Route-Gruppen, Auth-Modell                        |
| [UI](/docs/ui)             | Browser-Frontend: Seiten, Layouts, i18n                        |
| [Adapter](/docs/adapters)  | Plattformweite Übersicht der Adapters-Schicht                  |
| [Gateways](/docs/gateways) | Gateways und Adapter erstellen; Startreihenfolge; Capabilities |
| [DevOps](/docs/devops)     | Dockerfile, GitHub Actions, Umgebungsvariablen                 |

## Konfiguration

Installierte Manifeste und Anbieter bestimmen Funktionen. Bereitstellung konfiguriert Speicher und Transport; Kontoeinstellungen steuern persönliche Auswahl.

## Verhalten

OIDC und SAML benötigen hier einen injizierten Protokollclient. Einstellungsformulare erzeugen keinen Client; prüfe vor Bereitstellung die Technikansichten.

### Überblick

Dies ist das Root-Navigationsdokument für die Cognis-Entwicklerdokumentation. Alle Dokumente in diesem Set werden durch den In-App-Dokumentationsbrowser unter `/docs` und via `GET /api/v1/docs` bereitgestellt.

Info stellt Funktionen vor, Nutzung erklärt Abläufe und Beispiele und Technik beschreibt Verträge und Betrieb. Wähle Ansicht und Version passend zur Installation.

### Plattform

| Dokument                                 | Beschreibung                                            |
| ---------------------------------------- | ------------------------------------------------------- |
| [Übersicht](/docs/overview)              | Was Cognis ist und wie die Schichten zusammenpassen     |
| [Plattform-Features](/docs/features)     | Eingebaute Fähigkeiten und Adapter-Abdeckung            |
| [Dokumentationsstandard](/docs/standard) | Wie Dokumentation in dieser Codebase geschrieben wird   |
| [ACL-Matrix](/docs/acl-matrix)           | Rollendefinitionen und vollständige Berechtigungsmatrix |
| [Komponentenversionen](/docs/versions)   | Aktuelle Versionen aller Gateways, Adapter und Module   |

### Gateways

| Dokument                                          | Beschreibung                                   |
| ------------------------------------------------- | ---------------------------------------------- |
| [Auth-Gateway](/docs/gateways/auth)               | Authentifizierungsanbieter, Token-Ausstellung  |
| [Datenbank-Gateway](/docs/gateways/db)            | Datenbankzugriff, Executor, Dialekt-Helfer     |
| [Dateien-Gateway](/docs/gateways/files)           | Lokale Dateispeicher-Capabilities              |
| [Logging-Gateway](/docs/gateways/logging)         | Strukturiertes Logging                         |
| [Notify-Gateway](/docs/gateways/notify)           | Pluggbarer Benachrichtigungsversand            |
| [Social-Gateway](/docs/gateways/social/technical) | Profile, sozialer Graph, Beiträge, Nachrichten |

## Sicherheit

Funktionsverfügbarkeit gewährt keinen Datenzugriff. Anmeldung, Eigentum, private Momentaufnahmen und Anbieterlebensdauer bleiben getrennte Grenzen.

## Referenz

- [src/core/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/core/index.ts)
- [src/api/main.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/api/main.ts)
