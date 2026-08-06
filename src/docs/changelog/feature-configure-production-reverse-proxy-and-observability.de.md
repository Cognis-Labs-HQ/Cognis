# Produktionsleistung und Beobachtbarkeit

## Sichere, cachebewusste Produktionskante

Eine HTTP/2-TLS-Kante bietet Verbindungswiederverwendung, Brotli/gzip-Komprimierung, unveränderliche gehashte Assets, HTML-Revalidierung, vertrauenswürdige Weiterleitungsheader und private API-Antworten. `cognis-web` kann mit `COGNIS_WEB_TLS_MODE=deferred` nur über HTTP laufen, wenn TLS vorgelagert terminiert. Die Einrichtung schreibt Modus und konfigurierbare Zertifikatspfade in eine isolierte Web-Env-Datei; dadurch kann `cognis-web` weder Cognis-Verschlüsselungsschlüssel noch Datenbankzugangsdaten lesen. Compose wartet auf die Healthchecks der Datenbank und von Cognis. Aktualisierungen der Modulrouten initialisieren Nextcloud-Whiteboard-Runtime-Ressourcen nur einmal, Observability deklariert ausdrücklich, dass es keine Adapter besitzt, und gespeicherte Sicherheitseinstellungen bleiben während der Aktualisierung der Komponentenmetadaten sichtbar, statt kurz leere Standardwerte zu zeigen.

## Herstellerneutrale Leistungsmetrik

ctx-basierte Messungen für Server, Datenbank, Cache, Ereignisschleife, Web Vitals, Übertragung und SPA-Einhängung verwenden begrenzte Labels und Stichproben. Das DB-Timing erhält nun die rohe Executor-Oberfläche, die bei der Schemainitialisierung benötigt wird; außerdem melden fehlgeschlagene Bootstraps erforderlicher Gateways sofort ihre eigentliche Ursache, statt später als fehlende Abhängigkeit zu erscheinen.

## Messbare Leistungsbudgets

Gehostete Basiswerte für kalte, warme und SPA-Aufrufe sowie vor Redis zu prüfende Budgets sind dokumentiert.
