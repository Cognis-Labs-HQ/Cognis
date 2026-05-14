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

## Commits

- [5028bb9](https://github.com/le-firehawk/Cognis/commit/5028bb9)
