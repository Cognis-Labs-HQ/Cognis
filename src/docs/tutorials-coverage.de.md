# Tutorial-Abdeckung

Die folgende Übersicht erfasst interaktive Dashboard-Seiten und komponenteneigene Verwaltungsbereiche. Eine Anleitung ist nur bei aktiver Komponente, passender Seite beziehungsweise sichtbarem Bereich und ausreichender Kontoberechtigung verfügbar.

## Abdeckung

| Seite / Bereich                                            | Anleitung                      | Zugriff               |
| ---------------------------------------------------------- | ------------------------------ | --------------------- |
| `/settings` · `#general`                                   | Kontoeinstellungen             | Angemeldeter Nutzer   |
| `/settings` · `#appearance`                                | Darstellung                    | Angemeldeter Nutzer   |
| `/settings` · `#language`                                  | Spracheinstellungen            | Angemeldeter Nutzer   |
| `/settings` · `#datetime`                                  | Zeiteinstellungen              | Angemeldeter Nutzer   |
| `/settings` · `#advanced`                                  | Erweiterte Einstellungen       | Angemeldeter Nutzer   |
| `/administration` · `#components`                          | Komponenten verwalten          | Administrator         |
| `/administration` · `#status`                              | Systemstatus                   | Administrator         |
| `/administration` · `#security`                            | Sicherheitsregeln              | Administrator         |
| `/users`                                                   | Benutzerverwaltung             | Administrator         |
| `/administration/modules` · `.module-store-grid`           | Modul-Marktplatz               | Administrator         |
| `^/docs(?:/\|$)`                                           | Dokumentation                  | Angemeldeter Nutzer   |
| `^/changelogs(?:/\|$)`                                     | Veröffentlichungsverlauf       | Angemeldeter Nutzer   |
| `/calendar`                                                | Kalenderanleitung              | Angemeldeter Nutzer   |
| `^/profile(?:/\|$)`                                        | Profile und Beiträge           | Angemeldeter Nutzer   |
| `^/messages(?:/\|$)`                                       | Nachrichtenanleitung           | Angemeldeter Nutzer   |
| `/classes` · `#class-list`                                 | Kursanleitung                  | Angemeldeter Nutzer   |
| `/my-classes`                                              | Meine Kurse                    | Angemeldeter Nutzer   |
| `^/study/leaderboard(?:/\|$)`                              | Ranglistenanleitung            | Angemeldeter Nutzer   |
| `^/study/(?:[a-z-]+/)?flashcards(?:/\|$)`                  | Karteikartenanleitung          | Angemeldeter Nutzer   |
| `^/study/explore(?:/\|$)`                                  | Bibliothek erkunden            | Angemeldeter Nutzer   |
| `^/study/library/search(?:/\|$)`                           | Wörterbuchsuche                | Angemeldeter Nutzer   |
| `^/study/(?:library/)?requests(?:/\|$)`                    | Bibliotheksanfragen            | Angemeldeter Nutzer   |
| `^/study/library(?:/\|$)` · `.library-browser`             | Bibliothek verwalten           | Administrator         |
| `^/study/(?:settings\|welcome)$`                           | Lerneinstellungen              | Angemeldeter Nutzer   |
| `/shares`                                                  | Freigabeanleitung              | Angemeldeter Nutzer   |
| `/invite`                                                  | Einladungsanleitung            | Angemeldeter Nutzer   |
| `/settings` · `#auth-security-reset-panel`                 | Kontosicherheit                | Angemeldeter Nutzer   |
| `/settings` · `#tfa-settings-panel`                        | Zwei-Faktor-Sicherheit         | Angemeldeter Nutzer   |
| `/administration` · `#tfa-enforcement`                     | Zwei-Faktor-Pflicht            | Administrator         |
| `/settings` · `#notif-matrix-container`                    | Benachrichtigungseinstellungen | Angemeldeter Nutzer   |
| `/administration` · `#notifications`                       | Benachrichtigungszustellung    | Administrator         |
| `/administration` · `#broadcasts`                          | Mitteilungen verwalten         | Administrator         |
| `/administration` · `[data-files-quota-admin]`             | Speicherquoten                 | Administrator         |
| `/administration` · `#logs`                                | Protokolle prüfen              | Administrator         |
| `/administration` · `#registration`                        | Registrierungsregeln           | Administrator         |
| `/administration` · `#social`                              | Soziale Funktionen verwalten   | Administrator         |
| `/dashboard`                                               | Arbeitsbereich und Suchübung   | Angemeldeter Benutzer |
| Flashcards · `[data-study-session]`                        | Stapel verwalten               | Angemeldeter Benutzer |
| Flashcards · `[data-practice]`                             | Mit einem Stapel üben          | Angemeldeter Benutzer |
| `/administration/modules/:uuid` · `.module-detail-release` | Moduldetails                   | Administrator         |

## Externe Module

Die Begleitmodule decken Analytics, ElevenLabs, englisches und japanisches Lernen, Jitsi-Besprechungen und Verwaltung, alle drei Rechtsdokumentseiten, X- und LINE-Konfiguration sowie Whiteboard-Zeichenfläche, Konfiguration und Verwaltung ab. Anleitungen bleiben in ihren eigenen Repositorys verpackt.

Der Verwaltungsbereich für Rechtsdokumente bietet außerdem eine zugriffsbeschränkte Anleitung für Veröffentlichung und Zustimmungsberichte.

## Bewusste Grenzen

Schreibgeschützte Lizenz- und Fehlerseiten, Offline-Startcode und Entwicklungsfixtures haben keine Aktionsanleitung. Anmelderückrufe, Pflichtzustimmung, Passwortbestätigung und notwendige Einrichtungsdialoge behalten ihre eigenen Eingaberegeln. Empfängerstatusseiten zeigen nicht automatisch fremde Inhalte. Eingebettete Bereiche verwenden die Tutorial-Bedienelemente ihres eigenen Seitenkontexts.

## Aufgabenanleitungen

Die Abdeckung umfasst 55 Anleitungen mit 175 Schritten, darunter 22 Administratoranleitungen. Das Dashboard bietet eine praktische Suchübung: echte Suche öffnen, Suchtext eingeben, Optionen und Treffer prüfen und die Suche vor dem Fortfahren schließen. Erklärende Schritte verhindern versehentliches Hover-Verhalten und Aktivierungen; interaktive Schritte erlauben ihr Ziel ausdrücklich. Kontextanleitungen erscheinen bei sichtbaren Stapeldetails, Übungen oder Moduldetails.

Die Anleitungen behandeln Nachrichtenstart und Vorschau, Raummitglieder, Beitragsvorschau, Kalendernavigation und Terminplanung, Serienänderungen, Freigabefilter und Ablauf, Einladungen, Bibliotheksfilter und Wörterbuchvergleich, Hör- und Schreibübung, Favoriten und Inhaltsanfragen, Stapelerstellung, Übungsrückmeldung, Stapelbearbeitung/Freigabe/Export, Klassenbeitritt, Ranglisten, Schriftwahl, ungespeicherte Änderungen, Versionshinweise, Kontosuche sowie Modulkonfiguration und Lebenszyklus. Formulare und Löschbestätigungen bleiben bewusste komponenteneigene Interaktionen; Anleitungen erklären ihre Einstiegspunkte und weichen erforderlichen Dialogen.

## Dashboard-Menüs Und Aktionen

Die Dashboard-Anleitung hat 18 Schritte und öffnet Benachrichtigungen und Kontomenü bewusst über deren echte Klick-Handler. Klickübungen unterdrücken Hover; Erklärungen zu den Menüs lassen löschende oder navigierende Aktionen inaktiv. Das Kontomenü erklärt Einstellungen, Dokumentation, rollenabhängige Verwaltungslinks und Abmeldung. Die Anleitung behandelt außerdem die Seitenaktionsleiste, Sprachwechsel, Darstellung und Layoutbearbeitung.

Jeder Tutorial-Schritt legt `highlightNext` ausdrücklich fest: Erklärungen, die Weiter oder Fertig benötigen, aktivieren den Hinweis; interaktive und wartebasierte Übungen deaktivieren ihn. Bei reduzierter Bewegung bleibt eine statische Umrandung. Alle bestehenden Anleitungen wurden darauf geprüft, einschließlich Suchergebnissen und Benachrichtigungen.

Zurück von außerhalb einer abgeschlossenen Schrittgruppe oder eines Abhängigkeitszweigs führt zu dessen Einstieg und setzt die Ergebnisse zurück. Innerhalb eines Zweigs bleibt Zurück schrittweise. So wird ein geschlossener Suchdialog nicht erneut aufgerufen und automatisch übersprungen.

Seitenschritte können mit `targetMatch: "first"` den ersten sichtbaren, nutzbaren Treffer im deklarierten Abschnitt wählen. Standardmäßig ist weiterhin ein eindeutiger Treffer erforderlich. Fehlende oder deaktivierte Ziele folgen der festgelegten Überspringregel. Aktionsbezogene Hervorhebungen zeigen jetzt auf bearbeitbare Schalter, Rollenfelder, Speicherquoten, Benachrichtigungstests, Freigaben, Datensätze und Modulaktionen. Komponenten verwendet einen bearbeitbaren sichtbaren Schalter; notwendige und versteckte Steuerelemente sind ausgeschlossen.
