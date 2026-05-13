# Schüler-Klassenmitgliedschaft, Lehrerverwaltung & Studiehub

## Zusammenfassung

Fügt eine schülerspezifische Seite „Meine Klassen" unter `/my-classes` hinzu, auf der Schüler ihre eingeschriebenen Klassen einsehen, Beitrittsanträge für verfügbare Klassen stellen und Klassen verlassen können. Die Lehrerseite wurde um eine Sprachfilterung, Schülerverwaltung pro Klasse, Schülersuche sowie die Möglichkeit erweitert, Schüler einzuladen und Beitrittsanträge zu genehmigen oder abzulehnen.

Außerdem wurde der Studienbereich in den Benutzereinstellungen durch einen eigenen Studiehub ersetzt. Ein einmaliger Willkommensbildschirm unter `/study/welcome` ermöglicht neuen Benutzern die Auswahl von Sprachen aus den von Sprachmodulen (z. B. Japanisch) registrierten Sprachen. Nach dem Abschluss der Einführung landen Benutzer im Hub mit einer sprachbezogenen Unternavigation, sprachspezifischen Modullinks und einem Einstellungszahnrad, das eine Sprachverwaltungstabelle öffnet. Die Sprachliste stammt direkt vom Study-Gateway (registrierte Module).

Darüber hinaus sind Rollenbezeichnungen auf der Benutzerseite und im Dashboard jetzt vollständig lokalisiert.

## Geänderte Dateien / Komponenten

- `src/adapters/study/classes/store.ts` — Tabelle `class_memberships` sowie Store-Methoden für den Einschreibungsablauf hinzugefügt
- `src/adapters/study/classes/routes.ts` — Neue API-Endpunkte für Schüler- und Lehrerverwaltung
- `src/adapters/study/classes/index.ts` — Route `/my-classes` hinzugefügt; Fähigkeit `accountExists` eingebunden
- `src/adapters/study/classes/ui/my-classes.html` — Neue HTML-Seite für Schüler
- `src/adapters/study/classes/ui/my-classes.js` — Neues JavaScript für die Schülerseite
- `src/adapters/study/classes/ui/app.js` — Erweiterte Lehreransicht mit Sprachfilter und Schülerverwaltung
- `src/adapters/study/classes/ui/classes.css` — Stile für neue UI-Elemente ergänzt
- `src/gateways/study/gateway.ts` — Methode `listRegisteredLanguages()` hinzugefügt
- `src/gateways/study/bootstrap.ts` — Routen `/study/welcome` und `/study` (gemeinsames HTML); Endpunkt `GET /api/v1/study/registered-languages` hinzugefügt; Version auf 1.3.0 erhöht
- `src/gateways/study/manifest.json` — Version auf 1.3.0 erhöht
- `src/gateways/study/ui/classes-dashboard-element.js` — Dashboard-Element für Schüler hinzugefügt
- `src/gateways/study/ui/navbar.js` — Vereinfacht zu einem einfachen Navigationslink; Popup-Handler entfernt
- `src/gateways/study/ui/study.html` — HTML-Vorlage für `/study` und `/study/welcome`
- `src/gateways/study/ui/study.js` — Überarbeitet: Willkommens-Onboarding (Vollbreite, `/study/welcome`), Unternavigations-Hub (`/study`) mit Einstellungszahnrad und Sprachverwaltungstabelle
- `src/gateways/study/ui/study.css` — Aktualisierte Stile: vollständiger Willkommensbildschirm, Einstellungszahnrad-Schaltfläche, Spracheinstellungstabelle
- `src/gateways/study/ui/languages/*/strings.xml` — Schlüssel `gateway.study.language_settings` und `gateway.study.language` hinzugefügt (alle 4 Sprachen)
- `src/ui/reuse/app-router.js` — Routen `/study/*` zum Studiehub
- `src/ui/layouts/dashboard-layout.js` — Studieverknüpfung auf `/study` aktualisiert
- `src/ui/styles/settings.css` — Veraltete Studien-CSS-Klassen entfernt
- `src/ui/languages/*/strings.xml` — `ui.reuse.role_*`-Schlüssel hinzugefügt; `ui.app.settings.study.*` wiederhergestellt (alle 4 Sprachen)
- `src/ui/app/users/index.js` — Rollenbezeichnungen verwenden jetzt i18n-Schlüssel
- `src/ui/app/dashboard/index.js` — Rollenanzeige verwendet jetzt i18n-Schlüssel
- `src/adapters/study/classes/package.json` — Version auf 1.2.0 erhöht
- `src/docs/versions.en.md` — Komponentenversionen aktualisiert

## Commits

Siehe Branch `copilot/create-student-page-view` für den Commit-Verlauf.
