# Externe Module

## Stabile Identität

Jedes Modul besitzt eine lesbare ID und eine unveränderliche UUID. Abhängigkeiten in `requires` verwenden ausschließlich UUIDs.

## Repository-Vertrag

Ein Git-Repository liefert ein Modul. Im Stamm liegen `manifest.json`, `package.json`, `routes.json` sowie optional `bootstrap.js`, `api/index.js`, `ui/index.js` und `cli/index.js`. Nur `bootstrap.js` bindet das Modul über `ctx` an Cognis an; interne Dateien dürfen frei organisiert werden. Das Manifest beschreibt Metadaten, Kategorien, Fähigkeiten, Lizenz, UUID-Abhängigkeiten und relative Avatar- und Screenshot-Pfade.

`package.json` verwendet `"type": "module"` und dieselbe Version wie das Manifest. `routes.json` enthält immer ein Array. Vor der Installation prüft Cognis Einstiegspunkte, Store-Grafiken, sichere relative Pfade und deklarierte SHA-256-Prüfsummen; bei einem Fehler wird der temporäre Checkout vollständig entfernt.

Jedes externe Modul deklariert `entrypoints.bootstrap`. Cognis ruft beim Aktivieren ausschließlich `bootstrapModule(ctx)` auf. Routen, UI-Pfade, Dokumentation unter `docs/`, Änderungsnotizen unter `docs/changelog/`, Fähigkeiten und Flow-Erweiterungen werden automatisch aus dem Modul aufgenommen. Beim Deaktivieren oder Deinstallieren werden Rückbau-Hooks ausgeführt und alle über den bereichsgebundenen `ctx` registrierten Beiträge entfernt.

## Checkliste zur Auslagerung

Beim Verschieben in ein eigenes Repository bleiben UUID und lesbare ID unverändert. Repository-, Homepage- und Support-Links werden aktualisiert, Manifest- und Paketversion synchronisiert, Prüfsummen neu erzeugt und Monorepo-relative Importe durch `ctx`-Fähigkeiten und Abläufe ersetzt.

## Quellen und Sicherheit

Die Modulverwaltung im Benutzermenü erkennt Repositorys in GitHub-Organisationen und GitLab-Gruppen. Optionale, nur lesende PATs liegen im Schlüsselbund des Administrators; die Quellenkonfiguration speichert lediglich deren Kennung. Installation klont über HTTPS, prüft Manifest und UUID und verschiebt den Inhalt atomar. Code wird erst beim getrennten Aktivieren ausgeführt. Drittcode muss vor der Aktivierung geprüft werden.

## Store-Grafiken und Tags

Ein Modul kann zusätzlich zu allgemeinen `categories` genauere `tags` angeben; beide werden für die Filterung verwendet. Grafiken liegen im Repository unter `assets/`: `assets/icon.svg` oder `assets/icon.png` dient als Katalogsymbol, `assets/banner.svg`, `assets/banner.png` oder `assets/banner.jpg` als Titelbild der Detailseite. Die gewählten Pfade werden in `manifest.json` als `assets.icon` und `assets.banner` angegeben. Optionale Galeriebilder stehen in `assets.screenshots`.
