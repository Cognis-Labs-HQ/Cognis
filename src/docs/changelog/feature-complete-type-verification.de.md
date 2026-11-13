# Vollständige Typprüfung

**Feature-Zweig:** feature-complete-type-verification

## TypeScript-Quellprüfung

Vor jedem Commit `npm run typecheck` ausführen. `npm run ci:test` prüft Typen vor den Tests; beide CI-Pipelines verwenden dieselbe Prüfung. `npm run build` erzeugt Produktionsdateien separat mit esbuild für Node 24.

Die zentrale `tsconfig.json` ist das maßgebliche strikte Projekt ohne Dateiausgabe. Sie erfasst alle `.ts`-, `.tsx`-, `.mts`- und `.cts`-Dateien unter `src`, einschließlich Deklarationen, Tests sowie optionaler und verschachtelter Komponenten. Nur generierte `dist`-Verzeichnisse und Abhängigkeiten sind ausgeschlossen. Neue Komponenten benötigen keinen Referenzlisteneintrag.

NodeNext-Auflösung sowie ES2024- und DOM-Bibliotheken unterstützen Server- und Browserverträge. `@cognis/core` verweist auf die Quellen dieses Checkouts. Importiertes eigenes JavaScript liefert mit `allowJs` abgeleitete Typen; `checkJs` bleibt deaktiviert. Dies ist keine vollständige JavaScript-Prüfung. Komponentenkonfigurationen begrenzen die zentrale Prüfung nicht.

Abdeckungstests vergleichen die Compiler-Dateiliste mit dem nicht leeren Quellbestand, führen den echten npm-Befehl mit statischen Testdaten aus, erkennen Produktions- und Testfehler getrennt und prüfen wiederholte fehlerfreie Läufe ohne Dateiausgabe.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/61adeda08a08fbf2b6dc7f1cabfb6e1303410f83
