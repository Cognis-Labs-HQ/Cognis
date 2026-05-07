# UI

## Überblick

`src/ui/` hostet das Cognis-Browser-Frontend. Es stellt die Studieworkflows, sozialen Interaktionsoberflächen, Administrationspanels und den eingebetteten Dokumentationsbrowser bereit. Die UI ist eine server-seitig gerenderte Multi-Page-Anwendung.

Die UI-Schicht hat keine Kenntnis davon, welche Gateways oder Adapter installiert sind. Stattdessen tragen Gateways UI-Elemente zur Laufzeit über die `UIRegistry` und die Page-Extensions-API bei.

Alle benutzersichtbaren Texte gehen durch das i18n-System in `src/ui/reuse/i18n.js`. Kein Text ist in JavaScript oder HTML-Templates fest codiert.

## Verantwortlichkeiten

- Alle Seiten-Einstiegspunkte und zugehörige HTML-Templates hosten.
- Die Layout-Shells bereitstellen, durch die alle Nicht-Login-Seiten gerendert werden.
- Die Reuse-Utilities pflegen für i18n, Page Composer, Unsaved-Changes-Guards.
- Theme-Parität durchsetzen: jedes Element löst seine Farben aus CSS-Variablen auf.
- Die i18n-String-Packs für alle vier erforderlichen Sprachen bereitstellen.

## Architektur

### Verzeichnisstruktur

| Pfad                | Zweck                                               |
| ------------------- | --------------------------------------------------- |
| `src/ui/layouts/`   | Gemeinsame HTML-Shells                              |
| `src/ui/app/`       | Seiten-Einstiegspunkt-JavaScript-Module             |
| `src/ui/reuse/`     | Seitenübergreifende Utility-Module                  |
| `src/ui/styles/`    | CSS: Basis-Tokens, Layout, seitenspezifische Regeln |
| `src/ui/languages/` | i18n-String-Packs (en, de, ja, id)                  |

### UIRegistry

Gateways injizieren Admin-Panels und seitenspezifische UI-Beiträge zur Laufzeit über die `UIRegistry`. Der Endpunkt `GET /api/v1/ui/page-extensions/:pageId` gibt von allen aktivierten Gateways beigetragene Elemente für die benannte Seite zurück.

## i18n-Schlüssel-Konventionen

| Präfix               | Verwendung                                                                    |
| -------------------- | ----------------------------------------------------------------------------- |
| `ui.reuse.*`         | Labels, die über mehrere Seiten geteilt werden                                |
| `ui.reuse.generic.*` | Kontextfreie eigenständige Aktionswörter (speichern, verwerfen, zurücksetzen) |
| `ui.app.<page>.*`    | Seitenspezifischer Text                                                       |
| `ui.layout.*`        | Layout-Shell-Text und ARIA-Labels                                             |
