# Aktuelle Zugangsdatenhilfe

**Feature-Zweig:** feature-module-credential-translation

## Veränderliche Übersetzungen vor Nutzung aktualisieren

Host-Übersetzungskataloge unter veränderlichen Sprach-URLs warten vor der Darstellung auf eine gemeinsame Netzwerkaktualisierung. Bei einem Netzwerkfehler oder nach der bestehenden Frist von vier Sekunden bleibt ein verfügbarer Cache-Katalog nutzbar. Inhaltsadressierte Kataloge werden weiter zuerst aus dem Cache geladen; andere öffentliche Dateien behalten ihre bisherige Aktualisierung.

## Zugangsdatenhilfe lokalisiert halten

Modulquellenformulare behalten ihre vorhandenen Hinweise auf Englisch, Deutsch, Indonesisch und Japanisch. Fehlende Werte der bevorzugten Sprache verwenden Englisch; fehlende englische Werte führen weiterhin zu einem ausdrücklichen Fehler. Regressionstests prüfen Editorwechsel, wiederholtes Öffnen, gespeicherte Zugangsdaten und Cache-Wiederherstellung.

## Commits

- [018fd0697080bf608bb962e4ad39d659afecbc63](https://github.com/Cognis-Labs-HQ/Cognis/commit/018fd0697080bf608bb962e4ad39d659afecbc63)
- [2d5a53eab3b8ce07b9eb41d78078a4cb0b6fb70a](https://github.com/Cognis-Labs-HQ/Cognis/commit/2d5a53eab3b8ce07b9eb41d78078a4cb0b6fb70a)
- [35fbcec366050e04893571c865adbd94d9496f0b](https://github.com/Cognis-Labs-HQ/Cognis/commit/35fbcec366050e04893571c865adbd94d9496f0b)
