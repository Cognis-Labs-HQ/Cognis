# PR-Änderungsprotokoll — SPA-Router-Implementierung prüfen

## Zusammenfassung

Ein SPA-Konsistenzdurchlauf für Seiten-Einstiegspunkte wurde abgeschlossen:
Für die Einladungsseite wurde Router-Abdeckung ergänzt und das Muster
`mount()` + Direct-Load-Guard auf Auth- und Einladungsseiten vereinheitlicht.

Zusätzlich wurden bei Login/Registrierung die erforderlichen
`pageContext`-Metadaten (Titel + Untertitel) ergänzt und die Modulliste für
kleine Bildschirme durch responsive Tabellen-Container verbessert.

In einem Anschluss wurden außerdem blockierende Arbeiten aus dem initialen
Shell-Render entfernt: Das Dashboard-Template wird nun vorgewärmt,
Navbar-Plugins werden verzögert geladen, und Seiteninhalte warten beim ersten
Render nicht mehr auf das Laden gespeicherter Layout-Einstellungen.

Den Adapter-Seiten für Nachrichten, Klassen und Meine Klassen wurde das
fehlende `subtitle`-Feld im `pageContext` hinzugefügt, sodass diese vollständig
den KI-Anweisungen entsprechen (jeder Seitenkontext muss Titel und Untertitel
als i18n-Schlüssel enthalten).

Die Hiragana-Alphabet-Studienkomponente wurde korrigiert: Sie hatte keine
`componentStringBaseUrls` im `createI18n`-Aufruf (Gateway-Strings wurden
nie geladen), einen fest kodierten englischen Seitentitel, keinen Untertitel
sowie fest kodierte englische Strings im Element-Label und im Render-Inhalt.
Alle diese Probleme wurden durch den `gateway.study.*`-i18n-Namensraum behoben.

Der fest kodierte Seitentitel der Englisch-Alphabet-Komponente wurde auf
dieselbe Weise korrigiert.

In allen vier unterstützten Sprachen (de, en, id, ja) wurden alle zugehörigen
i18n-Schlüssel ergänzt: drei neue Untertitel-Schlüssel pro Sprache in den
globalen `strings.xml`-Dateien sowie fünf neue Schlüssel pro Sprache in den
Study-Gateway-`strings.xml`-Dateien.

Alle sequenziellen server-seitigen E/A-Vorgänge im Study-Gateway-Bootstrap
wurden parallelisiert, um eine 2–5 Sekunden dauernde Startverzögerung zu
beseitigen, die Node.js daran hinderte, Browser-Anfragen zu verarbeiten.
Die vier Entdeckungs- und Bootstrap-Phasen führen ihre Einzel-Aufgaben nun
gleichzeitig mit `Promise.all` aus; die beiden unabhängigen Phasen (Adapter-
Bootstrap und Sprachmodul-Bootstrap) laufen jetzt parallel zueinander.

Alle Datei-Lesevorgänge in `LanguageLibraryStore.#loadDataFiles()` wurden
parallelisiert: Alle Zeichenklassen-Dateien werden nun gleichzeitig gelesen,
und die vier Daten-Layer-Dateien (alt-characters, definitions, words, sentences)
werden in einem kombinierten `Promise.all`-Aufruf statt sequenziell geladen.

Die beiden `scanManifestDir`-Aufrufe beim Server-Start in `main.ts` wurden
parallelisiert.

Das ungenutzte tote Codeverzeichnis `ja/library/` wurde entfernt, dessen
Typdefinitionen und Re-Exporte durch das gemeinsame `reuse/library-store.ts`
ersetzt wurden und von nirgendwo importiert wurden.

## Geänderte Komponenten und Dateien

- Router und SPA-Tests:
    - `src/ui/reuse/app-router.js`
    - `src/ui/tests/app-router.test.js`
- Shell-/Layout-Performance:
    - `src/ui/layouts/dashboard-layout.js`
    - `src/ui/reuse/page-composer.js`
    - `src/ui/tests/page-composer-refresh.test.js`
- Seiten-Einstiegspunkte:
    - `src/ui/app/invite/index.js`
    - `src/ui/app/login/index.js`
    - `src/ui/app/register/index.js`
    - `src/ui/app/modules/index.js`
- UI-Sprachressourcen:
    - `src/ui/languages/en/strings.xml`
    - `src/ui/languages/de/strings.xml`
    - `src/ui/languages/id/strings.xml`
    - `src/ui/languages/ja/strings.xml`
- Neue gemeinsame Server-Antwort-Helfer:
    - `src/api/reuse/json-responses.ts` (neu)
    - `src/adapters/study/classes/routes.ts`
    - `src/modules/study/languages/en/index.ts`
    - `src/modules/study/languages/ja/index.ts`
- Neue gemeinsame Client-seitige Krypto-Hilfsfunktionen:
    - `src/ui/reuse/crypto-utils.js` (neu)
    - `src/adapters/social/messages/ui/app.js`
    - `src/adapters/notify/internal/ui/navbar-plugin.js`
- Neue gemeinsame Sprachdienstprogramme für die Study-Funktion:
    - `src/modules/study/languages/reuse/language-utils.js` (neu)
    - `src/gateways/study/ui/study.js`
    - `src/modules/study/languages/reuse/study-sub-navigation.js`
- CSS-Variablen-Korrekturen:
    - `src/adapters/notify/internal/ui/notifications.css`
    - `src/gateways/notify/ui/verify-email.css`
- Rollenprädikat-Funktionen nach `src/ui/reuse/access-role.js` verschoben:
    - `src/ui/reuse/access-role.js` — `isAdminScope`, `isTeacherScope`, `isStudentScope` hinzugefügt
    - `src/modules/study/languages/reuse/language-utils.js` — exportiert jetzt aus access-role.js weiter
    - `src/modules/study/languages/reuse/classroom-page.js` — `getRoleFlags()` entfernt
    - `src/adapters/study/classes/ui/app.js` — lokale Rollenverschlüsse entfernt; `renderMemberItems()` als Hilfsfunktion extrahiert

- Dynamische SPA-Routen-Erkennung für adaptereigene Seiten:
    - `src/api/ui-registry.ts` — neue `SpaRoute`-Registrierung (`registerSpaRoute` / `listSpaRoutes`)
    - `src/api/routes/ui/index.ts` — neuer authentifizierter Endpunkt `GET /api/v1/ui/app-routes`
    - `src/ui/reuse/spa-route-registry.js` (neu) — Client-Lader/Cache für App-Routen
    - `src/ui/reuse/app-router.js` — Adapter-Routen aus statischer Tabelle entfernt; Auflösung jetzt über statische + registrierte Routen
    - `src/gateways/social/bootstrap.ts` und `src/gateways/study/bootstrap.ts` — SPA-Routen-Registrierung in Adapter-Bootstrap-Kontexte durchgereicht
    - `src/adapters/social/messages/index.ts`, `src/adapters/social/profile/index.ts`, `src/adapters/study/classes/index.ts` — Adapter registrieren ihre SPA-Routen selbst
    - `src/api/tests/ui/ui-registry.test.ts`, `src/api/tests/ui/ui-routes.test.ts`, `src/ui/tests/app-router.test.js` — Testabdeckung für modulare Routenregistrierung aktualisiert

## Commits

- [5028bb9](https://github.com/le-firehawk/Cognis/commit/5028bb9)
- [ad0f87b](https://github.com/le-firehawk/Cognis/commit/ad0f87b)
