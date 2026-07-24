# Konventionen für die Suchfunktion

Gemeinsamer UI-Suchcode liegt in `src/ui/reuse/search-util/` und wird zur Kompatibilität weiterhin über `src/ui/reuse/search-bar.js` exportiert.

Komponenten mit durchsuchbaren Inhalten sollten ihre Suchintegration in einer eigenen Datei `ui/search/index.js` halten. Exportiere einen Provider namens `createSearchIndex` für Komponenteninhalt und einen Registrierungshelfer namens `registerSearchIndex`, wenn die Komponente den Lebenszyklus selbst verwaltet. Provider geben normalisierte Gruppen oder Einträge zurück; Abgleich, Ranking, Hervorhebung, Filterung, Rendering und das Verwerfen veralteter asynchroner Ergebnisse übernimmt die gemeinsame Suchfunktion.

Nutze CTX-Suchstufen für breite Kategorien: `visible-indexes` für sichtbare Seiten- und Navigationsinhalte, `component-indexes` für komponenteneigene Daten und `settings-index` für Einstellungen und Präferenzen. Aufwendige Arbeit wie das Laden von Nachrichten, Beiträgen, Dokumenten oder Kalendereinträgen bleibt asynchron im Provider, damit das Popup Ergebnisse anzeigen kann, sobald eine Quelle fertig ist.

Durchsuchbare DOM-Inhalte sollten `data-search-label`, `data-search-text`, `data-search-category` und `data-search-result-class` verwenden. Neue Komponenten sollten keine uneinheitlichen Dateinamen oder verstreuten Suchfunktionen in fachfremden Dateien verwenden.
