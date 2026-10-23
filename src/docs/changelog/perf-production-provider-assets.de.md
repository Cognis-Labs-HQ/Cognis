# Schnelleres Provider-Laden

**Feature-Zweig:** perf-production-provider-assets

## Produktionsbündel auflösen

Nur deklarierte Skript-URLs und direkte Navigationsleistenregistrierungen werden als Build-Einstiegspunkte erzwungen; gewöhnliche statische Importe bleiben gebündelte Abhängigkeiten. Der Build enthält wörtliche Host-Skriptverweise auch dann, wenn andere Einstiegspunkte sie importieren. Registrierte statische Gateway- und Adapterverzeichnisse lösen eigene URL-Präfixe zu ihren erzeugten Bündeln auf. Die API-Version steigt auf 0.6.22. Durch Konstruktionsabläufe ergänzte Einstellungsbereiche werden nach Autorisierung und Sichtbarkeitsprüfung über dasselbe Manifest aufgelöst. Jede Anfrage verwendet die aktuellen Deskriptoren; reine Quellressourcen und Modulressourcen mit Revisionsangaben behalten ihre maßgeblichen URLs.

## Host-Downloads überlappen

Nur vor dem Seitenaufbau benötigte Kataloge aktivieren das Vorladen. Navigationsleistenkataloge laden weiterhin nach Bedarf, damit ihre Erkennung bei der Navigation keine parallelen Hintergrundanfragen auslöst. Nach authentifizierter Erkennung werden unveränderliche Host-Bündel parallel vorgeladen; Importe und Einbindungen behalten ihre Reihenfolge. Links werden nach Abschluss oder Fehlern entfernt, aktive Provider nicht erneut geladen. Externe, Quell- und revisionsbezogene Modul-URLs behalten ihr Ladeverhalten.

## Laufzeitgrenzen erhalten

Regressionstests prüfen Modulidentität, Autorisierung, Aktivierungs- und Deinstallationsfilter, externe Ressourcenpfade, Einbindungsreihenfolge, Bereinigung und erneute Versuche. Private Antworten und Sprachdaten erhalten keine neuen Caches.

## Commits

- [9def8947fd3571bee5901acf901119e190d3f9d1](https://github.com/Cognis-Labs-HQ/Cognis/commit/9def8947fd3571bee5901acf901119e190d3f9d1)
- [207a05e4670647f3ad530c99b40a54c19bec94a4](https://github.com/Cognis-Labs-HQ/Cognis/commit/207a05e4670647f3ad530c99b40a54c19bec94a4)
