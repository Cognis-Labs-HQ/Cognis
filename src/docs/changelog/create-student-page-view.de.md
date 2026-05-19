# Schüler-Klassenmitgliedscha...

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
- `src/modules/study/languages/ja/components/hiragana-alphabet/ui/index.html` — Globale Stylesheets (`page-builder.css`, `reuse/page-sections.css`, `study.css`) und vollständige PWA-Meta-Elemente ergänzt, damit die Seite auch bei Hartneulade korrekt dargestellt wird
- `src/modules/study/languages/ja/components/library/ui/index.html` — Dasselbe: globale Stylesheets und PWA-Boilerplate hinzugefügt; `lang`-Attribut von `en` auf `ja` korrigiert
- `src/modules/study/languages/en/components/alphabet/ui/index.html` — Dasselbe: globale Stylesheets und PWA-Boilerplate hinzugefügt
- `src/ui/layouts/dashboard-layout.js` — Frische Darstellung und Shell-Wiederverwendung fügen das `.page-subnav`-Element jetzt hinzu oder entfernen es, anstatt ein `hidden`-Attribut umzuschalten – entsprechend dem Muster von Toolbar, Footer und Header
- `src/ui/styles/reuse/layout.css` — `.site-header` ist jetzt `position: sticky; top: 0; z-index: 1200`, sodass der gesamte Header (Topbar + Navrow + Unternavigation) beim Scrollen sofort oben fixiert wird; überflüssige `position: sticky`-, `top`- und `z-index`-Deklarationen in `.global-navrow` und responsiven Breakpoints entfernt
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

- `src/gateways/study/ui/study.js` und `src/gateways/study/ui/study.css` — Das Label "Aktive Sprachen" aus der Study-Subnavigation entfernt, Sprachoptionen direkt dargestellt und das Einstellungen-Zahnrad rechts neben den Sprachoptionen positioniert
- `src/gateways/study/ui/study.js` und `src/gateways/study/ui/languages/*/strings.xml` — Warn-Bestätigungs-Popup vor dem Entfernen der letzten aktiven Lernsprache ergänzt; erst danach Weiterleitung zu `/study/welcome`
- `src/modules/study/languages/ja/index.ts` — Japanische Child-Routen auf gateway-seitige generische URLs umgestellt (`/study/hiragana`, `/study/library`)
- `src/modules/study/languages/ja/components/*/ui/app.js` — Japanische Sprachmodulseiten auf exportierte SPA-`mount()`-Einstiege mit `createPageComposer` und gemeinsamer Seitenstruktur umgestellt
- `src/ui/reuse/app-router.js` — SPA-Routing für `/study/hiragana` und `/study/library` hinzugefügt
- `src/modules/study/languages/ja/{package.json,manifest.json}` und `src/docs/versions.en.md` — Version des Cognis-Japanisch-Moduls auf `1.1.2` erhöht

- `src/ui/styles/reuse/layout.css` — `flex: 1 0 auto` aus `.workspace` entfernt, damit der Bereich nur so groß wie sein Inhalt ist und nicht den Viewport auffüllt; `.global-footer` erhält `margin: auto auto 0`, um den Footer durch automatischen Oberseitenabstand im Flex-Column an den unteren Rand des Viewports zu schieben; Hintergrund von `.page-subnav` verwendet jetzt direkt `var(--nav-bg)` (wie `.global-navrow`) und erhält `backdrop-filter: blur(8px)`, damit die Leiste vollständig undurchsichtig bleibt, wenn Inhalte darunter durchscrollen
- `src/ui/styles/reuse/layout.css` und `src/ui/layouts/dashboard-layout.js` — Vertikales Padding der Subnavigation reduziert, Rundungen an allen Kanten wiederhergestellt und einen Scroll-Zustand für Seiten mit Subnavigation ergänzt, bei dem sich die primäre Navigationszeile nach dem Scrollbeginn einklappt, sodass die Subnavigation direkt an die globale Topbar anschließt
- `src/ui/layouts/dashboard-layout.js`, `src/ui/styles/reuse/layout.css`, `src/gateways/study/ui/study.css` und die Study-Unterdateien für die Kindseiten-Navigation — Das globale Study-Navigationselement bleibt jetzt auch auf Study-Unterseiten aktiv, die Lücke beziehungsweise Radius-Trennung zwischen primärer Navbar und Study-Subnavigation im Ausgangszustand wurde entfernt, und die Study-Modul-Links wurden an die Darstellung der globalen Navbar angepasst, während die Sprachumschalter unverändert bleiben

- `src/adapters/study/classes/{store.ts,routes.ts,package.json}`, `src/modules/study/languages/{en,ja}/index.ts`, neue Sprach-Klassenzimmer-UI-Dateien, Study-Reuse-Assets, Study-Library-UI/Store-Dateien, Study-Gateway-Sprachdateien, Dokumentation und Copilot-Anweisungen — Sprachspezifische Klassenzimmerseiten mit Sitzvisualisierung und rollenbasiertem Verhalten für Lehrkraft/Lernende ergänzt, Classroom-Layout-/Mitglieder-APIs hinzugefügt, den Library-Zugriff für Admins in der Study-Subnavigation unabhängig von der ausgewählten Sprache sichtbar gemacht (inkl. Sprachfilter-Übergabe) und Library-/Classroom-Dokumentation erweitert

- Nachbesserung: zusätzlichen Sprachselektor in der Bibliothek entfernt (Library nutzt jetzt den aktuell gewählten Study-Sprachkontext), fehlende Englisch-Option in der Study-Sprachnavigation korrigiert, Classroom ans Ende der Study-Subnavigation verschoben, schattierten "Keine Klassen verfügbar"-Leerzustand ergänzt und Abschneiden des Profil-Dropdowns unter der globalen Navbar behoben.

## Commits

Siehe Branch `copilot/create-student-page-view` für den Commit-Verlauf.

- Alle englischen Sprachdaten wurden aus dem fest codierten UI in die Bibliothek migriert: `data/characters/latin.json` mit den 26 lateinischen Buchstaben (A–Z) wurde hinzugefügt. Die Alphabet-Seite lädt die Zeichen nun aus der Bibliotheks-API statt sie fest zu kodieren. Das generische `LanguageLibraryStore`-Muster wurde in `reuse/library-store.ts` verschoben; beide Sprachmodule (Englisch und Japanisch) nutzen diese gemeinsame Implementierung. Die gemeinsame Funktion `mountStudyLibraryPage` in `reuse/library-page.js` ersetzt duplizierte Bibliotheks-CRUD-UI-Logik. Duplizierte CSS-Klassen aus komponentenspezifischen Stylesheets wurden entfernt. Die KI-Anweisungen und die Dokumentation wurden aktualisiert, um klar zu machen, dass die Bibliothek der einzige kanonische Datenspeicher für alle Sprachmodulinhalt ist.

- Konformitäts- und Echtzeit-Aktualisierungspass: Der z-Index des Benutzermenüs (Profil-Dropdown) wurde so korrigiert, dass es über der Seiten-Unternavigationsleiste erscheint; die `hasLibraryModule`-Prüfung wurde korrigiert, um nach Komponenten-`id` statt nach einer fest kodierten URL zu suchen, sodass die englische Bibliothek korrekt in der Unternavigation erscheint; `clearStudySubNavCache()` aus `study-sub-navigation.js` und `invalidateStudyChildComponentCache()` aus `app-router.js` werden beim Speichern von Spracheinstellungen aufgerufen, damit Unternavigation und SPA-Routen sofort aktualisiert werden; `classroom-page.js` und `library-page.js` laden nun korrekt die i18n-Strings des Study-Gateways; alle Study-Seiten haben jetzt ein `subtitle`-Feld in `pageContext`; JSDoc-Kommentare wurden zu `classroom-page.js` und `library-store.ts` hinzugefügt; umfangreiche Tests wurden für `LanguageLibraryStore` und `study-sub-navigation.js` hinzugefügt; die KI-Anweisungen wurden aktualisiert, um `subtitle` in `pageContext` für alle neuen Seiten zu verlangen.
