# Tutorial-Abdeckung

Die folgende Übersicht erfasst interaktive Dashboard-Seiten und komponenteneigene Verwaltungsbereiche. Eine Anleitung ist nur bei aktiver Komponente, passender Seite beziehungsweise sichtbarem Bereich und ausreichender Kontoberechtigung verfügbar.

## Abdeckung

| Seite / Bereich                                  | Anleitung                      | Zugriff             |
| ------------------------------------------------ | ------------------------------ | ------------------- |
| `/settings` · `#general`                         | Kontoeinstellungen             | Angemeldeter Nutzer |
| `/settings` · `#appearance`                      | Darstellung                    | Angemeldeter Nutzer |
| `/settings` · `#language`                        | Spracheinstellungen            | Angemeldeter Nutzer |
| `/settings` · `#datetime`                        | Zeiteinstellungen              | Angemeldeter Nutzer |
| `/settings` · `#advanced`                        | Erweiterte Einstellungen       | Angemeldeter Nutzer |
| `/administration` · `#components`                | Komponenten verwalten          | Administrator       |
| `/administration` · `#status`                    | Systemstatus                   | Administrator       |
| `/administration` · `#security`                  | Sicherheitsregeln              | Administrator       |
| `/users`                                         | Benutzerverwaltung             | Administrator       |
| `/administration/modules` · `.module-store-grid` | Modul-Marktplatz               | Administrator       |
| `^/docs(?:/\|$)`                                 | Dokumentation                  | Angemeldeter Nutzer |
| `^/changelogs(?:/\|$)`                           | Veröffentlichungsverlauf       | Angemeldeter Nutzer |
| `/calendar`                                      | Kalenderanleitung              | Angemeldeter Nutzer |
| `^/profile(?:/\|$)`                              | Profile und Beiträge           | Angemeldeter Nutzer |
| `^/messages(?:/\|$)`                             | Nachrichtenanleitung           | Angemeldeter Nutzer |
| `/classes` · `#class-list`                       | Kursanleitung                  | Angemeldeter Nutzer |
| `/my-classes`                                    | Meine Kurse                    | Angemeldeter Nutzer |
| `^/study/leaderboard(?:/\|$)`                    | Ranglistenanleitung            | Angemeldeter Nutzer |
| `^/study/(?:[a-z-]+/)?flashcards(?:/\|$)`        | Karteikartenanleitung          | Angemeldeter Nutzer |
| `^/study/explore(?:/\|$)`                        | Bibliothek erkunden            | Angemeldeter Nutzer |
| `^/study/library/search(?:/\|$)`                 | Wörterbuchsuche                | Angemeldeter Nutzer |
| `^/study/(?:library/)?requests(?:/\|$)`          | Bibliotheksanfragen            | Angemeldeter Nutzer |
| `^/study/library(?:/\|$)` · `.library-browser`   | Bibliothek verwalten           | Administrator       |
| `^/study/(?:settings\|welcome)$`                 | Lerneinstellungen              | Angemeldeter Nutzer |
| `/shares`                                        | Freigabeanleitung              | Angemeldeter Nutzer |
| `/invite`                                        | Einladungsanleitung            | Angemeldeter Nutzer |
| `/settings` · `#auth-security-reset-panel`       | Kontosicherheit                | Angemeldeter Nutzer |
| `/settings` · `#tfa-settings-panel`              | Zwei-Faktor-Sicherheit         | Angemeldeter Nutzer |
| `/administration` · `#tfa-enforcement`           | Zwei-Faktor-Pflicht            | Administrator       |
| `/settings` · `#notif-matrix-container`          | Benachrichtigungseinstellungen | Angemeldeter Nutzer |
| `/administration` · `#notifications`             | Benachrichtigungszustellung    | Administrator       |
| `/administration` · `#broadcasts`                | Mitteilungen verwalten         | Administrator       |
| `/administration` · `[data-files-quota-admin]`   | Speicherquoten                 | Administrator       |
| `/administration` · `#logs`                      | Protokolle prüfen              | Administrator       |
| `/administration` · `#registration`              | Registrierungsregeln           | Administrator       |
| `/administration` · `#social`                    | Soziale Funktionen verwalten   | Administrator       |

## Externe Module

Die Begleitmodule decken Analytics, ElevenLabs, englisches und japanisches Lernen, Jitsi-Besprechungen und Verwaltung, alle drei Rechtsdokumentseiten, X- und LINE-Konfiguration sowie Whiteboard-Zeichenfläche, Konfiguration und Verwaltung ab. Anleitungen bleiben in ihren eigenen Repositorys verpackt.

## Bewusste Grenzen

Schreibgeschützte Lizenz- und Fehlerseiten, Offline-Startcode und Entwicklungsfixtures haben keine Aktionsanleitung. Anmelderückrufe, Pflichtzustimmung, Passwortbestätigung und notwendige Einrichtungsdialoge behalten ihre eigenen Eingaberegeln. Empfängerstatusseiten zeigen nicht automatisch fremde Inhalte. Eingebettete Bereiche verwenden die Tutorial-Bedienelemente ihres eigenen Seitenkontexts.
