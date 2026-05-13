# Schüler-Klassenmitgliedschaft & Lehrerverwaltung

## Zusammenfassung

Fügt eine schülerspezifische Seite „Meine Klassen" unter `/my-classes` hinzu, auf der Schüler ihre eingeschriebenen Klassen einsehen, Beitrittsanträge für verfügbare Klassen stellen und Klassen verlassen können. Die Lehrerseite wurde um eine Sprachfilterung, Schülerverwaltung pro Klasse, Schülersuche sowie die Möglichkeit erweitert, Schüler einzuladen und Beitrittsanträge zu genehmigen oder abzulehnen.

Außerdem wurde der Studienbereich in den Benutzereinstellungen durch eine eigene `/study`-Hub-Seite ersetzt. Die Schaltfläche in der Navigationsleiste navigiert direkt zu `/study`. Die neue Seite zeigt einen animierten Willkommensbildschirm für neue Benutzer und einen Sprach-Hub mit Links zu registrierten Studienmodulen.

Darüber hinaus sind Rollenbezeichnungen auf der Benutzerseite und im Dashboard jetzt vollständig lokalisiert.

## Geänderte Dateien / Komponenten

- `src/adapters/study/classes/store.ts` — Tabelle `class_memberships` sowie Store-Methoden für den Einschreibungsablauf hinzugefügt
- `src/adapters/study/classes/routes.ts` — Neue API-Endpunkte für Schüler- und Lehrerverwaltung
- `src/adapters/study/classes/index.ts` — Route `/my-classes` hinzugefügt; Fähigkeit `accountExists` eingebunden
- `src/adapters/study/classes/ui/my-classes.html` — Neue HTML-Seite für Schüler
- `src/adapters/study/classes/ui/my-classes.js` — Neues JavaScript für die Schülerseite
- `src/adapters/study/classes/ui/app.js` — Erweiterte Lehreransicht mit Sprachfilter und Schülerverwaltung
- `src/adapters/study/classes/ui/classes.css` — Stile für neue UI-Elemente ergänzt
- `src/gateways/study/ui/classes-dashboard-element.js` — Dashboard-Element für Schüler hinzugefügt
- `src/gateways/study/bootstrap.ts` — Einstellungsbereich entfernt; `/study`-Route hinzugefügt; Version auf 1.3.0 erhöht
- `src/gateways/study/manifest.json` — Version auf 1.3.0 erhöht
- `src/gateways/study/ui/navbar.js` — Vereinfacht zu einem einfachen Navigationslink; Popup-Handler entfernt
- `src/gateways/study/ui/study.html` — Neue HTML-Vorlage für die `/study`-Seite
- `src/gateways/study/ui/study.js` — Neues Studiehub-Seitenmodul mit `createPageComposer`
- `src/gateways/study/ui/study.css` — Neues CSS für den Studiehub und den Willkommensbildschirm
- `src/gateways/study/ui/languages/*/strings.xml` — Neue `gateway.study.*`-Seitenzeichenketten (alle 4 Sprachen)
- `src/ui/reuse/app-router.js` — `/study`-Route hinzugefügt
- `src/ui/layouts/dashboard-layout.js` — Studieverknüpfung auf `/study` aktualisiert
- `src/ui/styles/settings.css` — Veraltete Studien-CSS-Klassen entfernt
- `src/ui/languages/*/strings.xml` — `ui.reuse.role_*`-Schlüssel hinzugefügt; `ui.app.settings.study.*` wiederhergestellt (alle 4 Sprachen)
- `src/ui/app/users/index.js` — Rollenbezeichnungen verwenden jetzt i18n-Schlüssel
- `src/ui/app/dashboard/index.js` — Rollenanzeige verwendet jetzt i18n-Schlüssel
- `src/adapters/study/classes/package.json` — Version auf 1.2.0 erhöht
- `src/docs/versions.en.md` — Komponentenversionen aktualisiert

## Commits

Siehe Branch `copilot/create-student-page-view` für den Commit-Verlauf.
