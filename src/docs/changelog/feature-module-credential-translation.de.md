# Aktuelle Zugangsdatenhilfe

**Feature-Zweig:** feature-module-credential-translation

## Veränderliche Übersetzungen vor Nutzung aktualisieren

Host-Übersetzungskataloge unter veränderlichen Sprach-URLs warten vor der Darstellung auf eine gemeinsame Netzwerkaktualisierung. Bei einem Netzwerkfehler oder nach der bestehenden Frist von vier Sekunden bleibt ein verfügbarer Cache-Katalog nutzbar. Inhaltsadressierte Kataloge werden weiter zuerst aus dem Cache geladen; andere öffentliche Dateien behalten ihre bisherige Aktualisierung.

## Zugangsdatenhilfe lokalisiert halten

Modulquellenformulare behalten ihre vorhandenen Hinweise auf Englisch, Deutsch, Indonesisch und Japanisch. Fehlende Werte der bevorzugten Sprache verwenden Englisch; fehlende englische Werte führen weiterhin zu einem ausdrücklichen Fehler. Regressionstests prüfen Editorwechsel, wiederholtes Öffnen, gespeicherte Zugangsdaten und Cache-Wiederherstellung.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/e01bd17a1da792c21b0e71e331678721bb7b7c00
