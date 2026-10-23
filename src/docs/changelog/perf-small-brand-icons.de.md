# Kleinere Markensymbole

**Feature-Zweig:** perf-small-brand-icons

## Installationssymbol verwenden

Seiten-Favicons, Kopfzeile, Dashboard-Widgets sowie Anmelde- und Fehleransichten verwenden das vorhandene quadratische Installationssymbol. Das ursprüngliche Bild bleibt unter seiner bisherigen URL verfügbar. Es entstehen weder eine Bildkonvertierung noch neue Ressourcenabhängigkeiten.

## Bildtransfer beim Start begrenzen

Bei der Installation speichert der Service Worker die vorhandenen kleinen und großen Installationssymbole vorab, ohne zusätzlich das übergroße Quellbild abzurufen. Eine neue Cache-Version aktualisiert die Ressourcenliste bestehender Clients. Die Behandlung privater APIs und von Modulrevisionen bleibt unverändert. Tests der Routen und der Worker-Installation sichern die Bildtransferbudgets ab.

## Commits

- [c430f10894603ad0a04c384ea0def28f7684fcd1](https://github.com/Cognis-Labs-HQ/Cognis/commit/c430f10894603ad0a04c384ea0def28f7684fcd1)
