# Schnelleres Provider-Laden

**Feature-Zweig:** perf-production-provider-assets

## Produktionsbündel auflösen

Der Build enthält wörtliche Host-Skriptverweise auch dann, wenn andere Einstiegspunkte sie importieren. Registrierte statische Gateway- und Adapterverzeichnisse lösen eigene URL-Präfixe zu ihren erzeugten Bündeln auf. Die API-Version steigt auf 0.6.22.

## Host-Downloads überlappen

Nach authentifizierter Erkennung werden unveränderliche Host-Bündel parallel vorgeladen; Importe und Einbindungen behalten ihre Reihenfolge. Links werden nach Abschluss oder Fehlern entfernt, aktive Provider nicht erneut geladen. Externe, Quell- und revisionsbezogene Modul-URLs behalten ihr Ladeverhalten.

## Laufzeitgrenzen erhalten

Regressionstests prüfen Modulidentität, Autorisierung, Aktivierungs- und Deinstallationsfilter, externe Ressourcenpfade, Einbindungsreihenfolge, Bereinigung und erneute Versuche. Private Antworten und Sprachdaten erhalten keine neuen Caches.

## Commits
