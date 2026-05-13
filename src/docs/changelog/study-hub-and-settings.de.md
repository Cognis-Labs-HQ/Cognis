# Studiehub-Seite und Entfernung der Einstellungen

## Zusammenfassung

Der Studienbereich in den Benutzereinstellungen wurde durch eine eigene `/study`-Seite ersetzt. Die Schaltfläche „Lernen" in der Navigationsleiste navigiert jetzt direkt zu `/study`, anstatt ein Popup zu öffnen. Die neue Seite zeigt einen animierten Willkommensbildschirm, wenn noch keine Sprachen ausgewählt wurden, und einen Studiehub mit Links zu den registrierten Modulen, sobald Sprachen gewählt wurden.

## Geänderte Dateien / Komponenten

- `src/gateways/study/bootstrap.ts` — Einstellungsbereich entfernt; `/study`-Seitenroute hinzugefügt; Version auf 1.3.0 erhöht
- `src/gateways/study/manifest.json` — Version auf 1.3.0 erhöht
- `src/gateways/study/ui/study-prefs.js` — Gelöscht (nicht mehr referenziert nach Entfernung des Einstellungsbereichs)
- `src/gateways/study/ui/navbar.js` — Vereinfacht zu einem einfachen Navigationslink; Popup-Handler entfernt
- `src/gateways/study/ui/study.html` — Neue HTML-Vorlage für die `/study`-Seite
- `src/gateways/study/ui/study.js` — Neues Studiehub-Seitenmodul mit `createPageComposer`
- `src/gateways/study/ui/study.css` — Neues CSS für den Studiehub und den Willkommensbildschirm
- `src/ui/reuse/app-router.js` — `/study`-Route hinzugefügt
- `src/ui/layouts/dashboard-layout.js` — Studieverknüpfung auf `/study` aktualisiert
- `src/ui/styles/settings.css` — Veraltete Studien-CSS-Klassen entfernt
- `src/ui/languages/*/strings.xml` — `ui.app.settings.study.*`-Schlüssel durch `ui.app.study.*` ersetzt; `ui.page.title.study` hinzugefügt (alle 4 Sprachen)
- `src/docs/versions.en.md` — Study-Gateway-Version auf 1.3.0 aktualisiert

## Commits

- https://github.com/le-firehawk/Cognis/commit/1170b58
