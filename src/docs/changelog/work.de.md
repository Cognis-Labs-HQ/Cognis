# Produktionsleistung und Beobachtbarkeit

## Sichere, cachebewusste Produktionskante

Eine HTTP/2-TLS-Kante bietet Verbindungswiederverwendung, Brotli/gzip-Komprimierung, unveränderliche gehashte Assets, HTML-Revalidierung, vertrauenswürdige Weiterleitungsheader und private API-Antworten. Die Kante heißt in Compose `cognis-web` und wird von GitLab CI veröffentlicht.

## Herstellerneutrale Leistungsmetrik

ctx-basierte Messungen für Server, Datenbank, Cache, Ereignisschleife, Web Vitals, Übertragung und SPA-Einhängung verwenden begrenzte Labels und Stichproben.

## Messbare Leistungsbudgets

Gehostete Basiswerte für kalte, warme und SPA-Aufrufe sowie vor Redis zu prüfende Budgets sind dokumentiert.
