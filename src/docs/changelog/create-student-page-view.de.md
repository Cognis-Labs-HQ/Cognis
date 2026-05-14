# Schüler-Klassenmitgliedschaft, Lehrerverwaltung & Studiehub

## Zusammenfassung

Fügt eine schülerspezifische Seite „Meine Klassen" unter `/my-classes` hinzu, auf der Schüler ihre eingeschriebenen Klassen einsehen, Beitrittsanträge für verfügbare Klassen stellen und Klassen verlassen können. Die Lehrerseite wurde um eine Sprachfilterung, Schülerverwaltung pro Klasse, Schülersuche sowie die Möglichkeit erweitert, Schüler einzuladen und Beitrittsanträge zu genehmigen oder abzulehnen.

Außerdem wurde der Studienbereich in den Benutzereinstellungen durch einen eigenen Studiehub ersetzt. Ein einmaliger Willkommensbildschirm unter `/study/welcome` ermöglicht neuen Benutzern die Auswahl von Sprachen aus den von Sprachmodulen (z. B. Japanisch) registrierten Sprachen. Nach dem Abschluss der Einführung landen Benutzer im Hub mit einer neuen, vom Composer verwalteten Sub-Navigation direkt unter der globalen Navigation. Diese ist klar vom seitlichen Toolbar-Bereich getrennt, wird dynamisch aus den Child-UIs der Sprachmodule befüllt und verwendet `/study/settings` für Spracheinstellungen. Die Sprachliste stammt direkt vom Study-Gateway (registrierte Module).

Darüber hinaus sind Rollenbezeichnungen auf der Benutzerseite und im Dashboard jetzt vollständig lokalisiert.

## Geänderte Dateien / Komponenten

- `src/adapters/study/classes/store.ts` — Tabelle `class_memberships` sowie Store-Methoden für den Einschreibungsablauf hinzugefügt
- `src/adapters/study/classes/routes.ts` — Neue API-Endpunkte für Schüler- und Lehrerverwaltung
- `src/adapters/study/classes/index.ts` — Route `/my-classes` hinzugefügt; Fähigkeit `accountExists` eingebunden
- `src/adapters/study/classes/ui/my-classes.html` — Neue HTML-Seite für Schüler
- `src/adapters/study/classes/ui/my-classes.js` — Neues JavaScript für die Schülerseite
- `src/adapters/study/classes/ui/app.js` — Erweiterte Lehreransicht mit Sprachfilter und Schülerverwaltung
- `src/adapters/study/classes/ui/classes.css` — Stile für neue UI-Elemente ergänzt
- `src/gateways/study/gateway.ts` — Metadaten für Sprachmodule ergänzt und registrierte Sprachmodule um Aktivierungsinformationen erweitert
- `src/gateways/study/bootstrap.ts` — Routen `/study/welcome`, `/study` und `/study/settings` (gemeinsames HTML); Endpunkt `GET /api/v1/study/registered-languages` hinzugefügt; Sprachliste und Child-Routen nun nach Modul-Aktivierungsstatus gefiltert
- `src/gateways/study/manifest.json` — Version auf 1.4.0 erhöht
- `src/gateways/study/ui/classes-dashboard-element.js` — Dashboard-Element für Schüler hinzugefügt
- `src/gateways/study/ui/navbar.js` — Vereinfacht zu einem einfachen Navigationslink; Popup-Handler entfernt; ruft registrierte Sprachen ab und blendet den Link aus, wenn keine verfügbar sind
- `src/ui/styles/reuse/layout.css` — Regel `.topnav a[aria-disabled="true"]` hinzugefügt, um ausgegrautе Nav-Einträge visuell zu dimmen und Klicks zu unterbinden
- `src/gateways/study/ui/study.html` — HTML-Vorlage für `/study` und `/study/welcome`
- `src/gateways/study/ui/study.js` — Überarbeitet: einmaliges Onboarding (`/study/welcome`), Dashboard (`/study`), Einstellungen (`/study/settings`), modulgetriebene Sub-Navigationspunkte und Dropdown für aktive Sprachen
- `src/gateways/study/ui/study.css` — Aktualisierte Stile: Modul-Subnavigation, Dropdown für aktive Sprachen und 50/50-Spracheinstellungspanels
- `src/gateways/study/ui/languages/*/strings.xml` — Schlüssel `gateway.study.available_languages` und `gateway.study.active_languages` hinzugefügt (alle 4 Sprachen)
- `src/ui/reuse/app-router.js` — Nur `/study`, `/study/welcome` und `/study/settings` werden dem Studiehub zugeordnet; Modulseiten behalten ihre eigenen Handler
- `src/ui/reuse/page-composer.js` — Neuer Composer-Slot für eine Sub-Navigation, getrennt von der seitlichen Toolbar
- `src/ui/layouts/dashboard-layout.js` — `subNavigation`-Slot in das Layout verdrahtet
- `src/ui/public/templates/dashboard-layout.html` — Platzhalter für die Sub-Navigationszeile unter der globalen Navigation ergänzt
- `src/ui/styles/reuse/layout.css` — Globale Stile für die neue Composer-Sub-Navigationszeile ergänzt
- `src/ui/layouts/dashboard-layout.js` — Studieverknüpfung auf `/study` aktualisiert
- `src/ui/styles/settings.css` — Veraltete Studien-CSS-Klassen entfernt
- `src/ui/languages/*/strings.xml` — `ui.reuse.role_*`-Schlüssel hinzugefügt; `ui.app.settings.study.*` wiederhergestellt (alle 4 Sprachen)
- `src/ui/app/users/index.js` — Rollenbezeichnungen verwenden jetzt i18n-Schlüssel
- `src/ui/app/dashboard/index.js` — Rollenanzeige verwendet jetzt i18n-Schlüssel
- `src/adapters/study/classes/package.json` — Version auf 1.2.0 erhöht
- `src/docs/versions.en.md` — Komponentenversionen aktualisiert
- `src/gateways/study/tests/bootstrap.test.ts` — Gateway-Tests für die Aufnahme des japanischen Moduls bei Deaktivierung/Aktivierung hinzugefügt

- `src/gateways/study/bootstrap.ts` — Direkte Abfragen der Modultabelle entfernt und durch Study-eigene Verfügbarkeitsaufnahme über die Capability `study:setLanguageModuleEnabled` ersetzt
- `src/gateways/study/gateway.ts` — In-Gateway-Status für Sprachmodul-Verfügbarkeit ergänzt, der Sprachliste und Child-Routen steuert
- `src/api/server.ts` und `src/api/main.ts` — Modul-Aktivierungszyklus und Startzustands-Wiederherstellung so verdrahtet, dass Sprachverfügbarkeit in das Study-Gateway gepusht wird
- `src/gateways/study/manifest.json` und `src/docs/versions.en.md` — Study-Gateway-Version auf 1.5.0 erhöht

- `src/gateways/study/ui/study.js` — Top-Level-Mount für Direktaufruf in try/catch gekapselt, damit Study-SPA-Importfehler sauber protokolliert werden
- `src/adapters/study/classes/ui/my-classes.js` — Top-Level-Mount für Direktaufruf in try/catch gekapselt, um SPA-Importe robuster zu machen
- `src/ui/reuse/app-router.js` — Variablenname für bereinigten Pfad in der Routenprüfung präzisiert

## Commits

Siehe Branch `copilot/create-student-page-view` für den Commit-Verlauf.
