# PR-Änderungsprotokoll

## Zusammenfassung

Der veraltete japanische Study-Adapter unter
`src/adapters/study/japanese/` wurde entfernt, um doppelte und
irreführende Struktur zu beseitigen, da japanische Lerninhalte nun über
Sprachmodule bereitgestellt werden.

Das Study-Gateway wurde so angepasst, dass beim Adapter-Discovery/Bootstrap
keine hartkodierte Legacy-Ausnahme mehr verwendet wird.

Auf der Profilseite wurde ein Inline-Hinweistext durch einen Info-Tooltip für
die Sichtbarkeit von Beiträgen ersetzt.

Gateway- und adapterspezifische HTML-Seiten, JavaScript-App-Module und
CSS-Stylesheets wurden aus `src/ui/` in die jeweiligen Adapter- und
Gateway-Verzeichnisse verschoben, entsprechend dem Prinzip der
Komponentenselbstständigkeit. Die Adapter für Profil, Nachrichten und Klassen
stellen jetzt jeweils `index.html`, `app.js` und CSS aus einem `ui/`-
Unterverzeichnis bereit. Die Einstellungsmodule für Benachrichtigungen und
Studienpräferenzen wurden in die jeweiligen Gateway-`ui/`-Verzeichnisse
verschoben und um einen `createSettingsSection`-Export erweitert.

Ein `SettingsSection`-Pluginsystem wurde zur `UIRegistry` hinzugefügt, damit
Gateways Abschnitte der Einstellungsseite dynamisch registrieren können. Ein
neuer `GET /api/v1/ui/settings-sections`-Endpunkt stellt registrierte
Abschnitte dem Client bereit. Die Einstellungsseite lädt beigesteuerte
Abschnitte jetzt dynamisch, ohne hartkodierte Importe für Benachrichtigungen
und Studienpräferenzen.

## Geänderte Dateien/Komponenten

- Study-Gateway:
    - `src/gateways/study/gateway.ts`
    - `src/gateways/study/bootstrap.ts`
    - `src/gateways/study/manifest.json`
- Entfernte Legacy-Adapter:
    - `src/adapters/study/japanese/` (entfernt)
- Profil-Adapter:
    - `src/adapters/social/profile/index.ts`
    - `src/adapters/social/profile/ui/app.js`
    - `src/adapters/social/profile/ui/index.html`
    - `src/adapters/social/profile/ui/profile.css`
- Nachrichten-Adapter:
    - `src/adapters/social/messages/index.ts`
    - `src/adapters/social/messages/ui/app.js`
    - `src/adapters/social/messages/ui/index.html`
    - `src/adapters/social/messages/ui/messages.css`
- Klassen-Adapter:
    - `src/adapters/study/classes/index.ts`
    - `src/adapters/study/classes/ui/app.js`
    - `src/adapters/study/classes/ui/index.html`
    - `src/adapters/study/classes/ui/classes.css`
- Notify-Gateway:
    - `src/gateways/notify/bootstrap.ts`
    - `src/gateways/notify/ui/notification-prefs.js`
- Study-Gateway:
    - `src/gateways/study/ui/study-prefs.js`
- UI-Infrastruktur:
    - `src/api/ui-registry.ts`
    - `src/api/routes/ui/index.ts`
    - `src/ui/app/settings/index.js`
    - `src/ui/reuse/app-router.js`

## Commits

- [e349311](https://github.com/Cognis-Labs-HQ/Cognis/commit/e349311)
- [e81c254](https://github.com/Cognis-Labs-HQ/Cognis/commit/e81c254)

---

## Pass 2 — Auth, Profil und Notify-UI Co-location

### Zusammenfassung

Weitere fehlerplatzierte Core-Dateien wurden an ihren kanonischen Eigentümerort verschoben. Die Auth-Token-Utilities (`access-tokens.ts`, `guard.ts`) wurden aus `src/api/auth/` nach `src/gateways/auth/` verschoben. Der Auth-Route-Handler und sein Test wurden nach `src/gateways/auth/routes/` und `src/gateways/auth/tests/` verschoben. Der Profil-Route-Handler und die Store-Schnittstelle wurden aus `src/api/` in `src/adapters/social/profile/` verschoben. Die E-Mail-Verifizierungsseite (HTML, JS, CSS) wurde aus `src/ui/` nach `src/gateways/notify/ui/` verschoben. Das Notify-Gateway ist nun für diese Seite zuständig. Der `src/modules/study-language-ja/`-Stub wurde entfernt und sein Manifest in das eigentliche japanische Modul unter `src/modules/study/languages/ja/` integriert. Veraltete `src/docs/profile.*`-Dokumente wurden gelöscht.

### Pass 2 Commits

- [34fc21c](https://github.com/Cognis-Labs-HQ/Cognis/commit/34fc21c)
- [47a2c1a](https://github.com/Cognis-Labs-HQ/Cognis/commit/47a2c1a)
- [7916873](https://github.com/Cognis-Labs-HQ/Cognis/commit/7916873)

---

## Pass 3 — Gateway-Deaktivierungsschutz, Japan-Modul-Fix, KI-Anweisungen

### Zusammenfassung

Eine Regression wurde behoben, bei der der Einstellungsbereich und das Navbar-Plugin des Study-Gateways auch nach der Deaktivierung des Gateways noch sichtbar blieben. Das Interface `SettingsSection` wurde um `isEnabled` ergänzt — analog zum bestehenden Prädikat bei `NavbarPlugin`. Der Endpunkt `GET /api/v1/ui/settings-sections` filtert Bereiche nun bei der Antwort.

Das japanische Sprachmodul erscheint wieder in der Modulliste der Administration. Die vorherige Sitzung entfernte den Stub `src/modules/study-language-ja/`, ohne den Bootstrap-Scanner auf den echten Manifest-Pfad `src/modules/study/languages/ja/` auszuweiten; der Scanner liest diesen Pfad nun ebenfalls.

Die KI-Beitragsinstruktionen wurden gestärkt: Ein neuer Abschnitt „Sauberkeit des Codebases ist oberstes Gebot" stellt klar, dass nicht-konformer Code nie akzeptabel ist und jedes Feedback, das auf Verstöße hinweist, umzusetzen ist.

### Geänderte Dateien

- `.github/copilot-instructions.md` — Neues Gebot zur Codebase-Sauberkeit.
- `src/api/ui-registry.ts` — `isEnabled` zu `SettingsSection` hinzugefügt.
- `src/api/routes/ui/index.ts` — Einstellungsbereiche werden nach `isEnabled` gefiltert.
- `src/gateways/study/bootstrap.ts` — Einstellungsbereich und Navbar-Plugin über `isEnabled`-Prädikat gesteuert.
- `src/api/main.ts` — Bootstrap scannt auch `study/languages/` nach Sprachmodul-Manifesten.
- `src/api/tests/ui/ui-routes.test.ts` — Drei neue Tests für den Einstellungsbereiche-Endpunkt.

### Pass-3-Commits

- [f4aa63b](https://github.com/Cognis-Labs-HQ/Cognis/commit/f4aa63b)
