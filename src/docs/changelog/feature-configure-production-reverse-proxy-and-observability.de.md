# Produktionsleistung und Beobachtbarkeit

## Sichere, cachebewusste Produktionskante

Eine HTTP/2-TLS-Kante bietet Verbindungswiederverwendung, Brotli/gzip-Komprimierung, unveränderliche gehashte Assets, HTML-Revalidierung, vertrauenswürdige Weiterleitungsheader und private API-Antworten. Der Kantenservice und das Image heißen in jeder Compose-Datei `cognis-web`, werden von GitLab CI veröffentlicht, installieren Brotli über Alpines natives Nginx-Modulpaket und können mit `COGNIS_EDGE_TLS_MODE=deferred` nur über HTTP laufen, wenn TLS vorgelagert terminiert.

## Herstellerneutrale Leistungsmetrik

ctx-basierte Messungen für Server, Datenbank, Cache, Ereignisschleife, Web Vitals, Übertragung und SPA-Einhängung verwenden begrenzte Labels und Stichproben.

## Messbare Leistungsbudgets

Gehostete Basiswerte für kalte, warme und SPA-Aufrufe sowie vor Redis zu prüfende Budgets sind dokumentiert.
