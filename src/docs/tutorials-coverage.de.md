# Tutorial-Abdeckung

Die folgende Übersicht erfasst interaktive Dashboard-Seiten und komponenteneigene Verwaltungsbereiche. Eine Anleitung ist nur bei aktiver Komponente, passender Seite beziehungsweise sichtbarem Bereich und ausreichender Kontoberechtigung verfügbar.

## Abdeckung

| Seite / Bereich                                            | Anleitung                    | Zugriff               |
| ---------------------------------------------------------- | ---------------------------- | --------------------- |
| `/settings` · `#general`                                   | Kontoeinstellungen           | Angemeldeter Nutzer   |
| `/settings` · `#appearance`                                | Darstellung                  | Angemeldeter Nutzer   |
| `/settings` · `#language`                                  | Spracheinstellungen          | Angemeldeter Nutzer   |
| `/settings` · `#datetime`                                  | Zeiteinstellungen            | Angemeldeter Nutzer   |
| `/settings` · `#advanced`                                  | Erweiterte Einstellungen     | Angemeldeter Nutzer   |
| `/administration` · `#components`                          | Komponenten verwalten        | Administrator         |
| `/administration` · `#status`                              | Systemstatus                 | Administrator         |
| `/administration` · `#security`                            | Sicherheitsregeln            | Administrator         |
| `/users`                                                   | Benutzerverwaltung           | Administrator         |
| `/administration/modules` · `.module-store-grid`           | Modul-Marktplatz             | Administrator         |
| `^/docs(?:/\|$)`                                           | Dokumentation                | Angemeldeter Nutzer   |
| `^/changelogs(?:/\|$)`                                     | Veröffentlichungsverlauf     | Angemeldeter Nutzer   |
| `/dashboard`                                               | Arbeitsbereich und Suchübung | Angemeldeter Benutzer |
| `/administration/modules/:uuid` · `.module-detail-release` | Moduldetails                 | Administrator         |

## Komponentenanleitungen

Seiten, Ziele und Zugriffsrechte einer Funktion sind bei ihrer Komponente dokumentiert. Optionale Komponenten liefern keine Übersetzungen oder Tutorial-Definitionen für Kernseiten.

- [Kalenderanleitung](/docs/gateways/calendar/tutorials)
- [Profile und Beiträge](/docs/adapters/social/profile/tutorials)
- [Nachrichtenanleitung](/docs/adapters/social/messages/tutorials)
- [Kursanleitung](/docs/adapters/study/classes/tutorials)
- [Ranglistenanleitung](/docs/adapters/study/leaderboard/tutorials)
- [Karteikartenanleitung](/docs/adapters/study/flashcards/tutorials)
- [Bibliothek erkunden](/docs/adapters/study/library/tutorials)
- [Lerneinstellungen](/docs/gateways/study/tutorials)
- [Freigabeanleitung](/docs/gateways/share/tutorials)
- [Einladungsanleitung](/docs/gateways/registration/tutorials)
- [Kontosicherheit](/docs/gateways/auth/tutorials)
- [Zwei-Faktor-Sicherheit](/docs/gateways/tfa/tutorials)
- [Benachrichtigungseinstellungen](/docs/gateways/notify/tutorials)
- [Speicherquoten](/docs/gateways/files/tutorials)
- [Protokolle prüfen](/docs/gateways/logging/tutorials)
- [Soziale Funktionen verwalten](/docs/gateways/social/tutorials)

## Externe Module

Die Abdeckung externer Module wird im `docs/`-Verzeichnis des jeweiligen Repositorys zusammen mit dem Anbieter gepflegt. Der Integrationsvertrag steht unter [externe Module](/docs/modules/external).

## Bewusste Grenzen

Schreibgeschützte Lizenz- und Fehlerseiten, Offline-Startcode und Entwicklungsfixtures haben keine Aktionsanleitung. Anmelderückrufe, Pflichtzustimmung, Passwortbestätigung und notwendige Einrichtungsdialoge behalten ihre eigenen Eingaberegeln. Empfängerstatusseiten zeigen nicht automatisch fremde Inhalte. Eingebettete Bereiche verwenden die Tutorial-Bedienelemente ihres eigenen Seitenkontexts.

## Dashboard-Menüs Und Aktionen

Die Dashboard-Anleitung hat 18 Schritte und öffnet Benachrichtigungen und Kontomenü bewusst über deren echte Klick-Handler. Klickübungen unterdrücken Hover; Erklärungen zu den Menüs lassen löschende oder navigierende Aktionen inaktiv. Das Kontomenü erklärt Einstellungen, Dokumentation, rollenabhängige Verwaltungslinks und Abmeldung. Die Anleitung behandelt außerdem die Seitenaktionsleiste, Sprachwechsel, Darstellung und Layoutbearbeitung.
