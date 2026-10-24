# Kleinere Markensymbole

**Feature-Zweig:** perf-small-brand-icons

## Installationssymbol verwenden

Seiten-Favicons, Kopfzeile, Dashboard-Widgets sowie Anmelde- und Fehleransichten verwenden das vorhandene quadratische Installationssymbol. Das ursprüngliche Bild bleibt unter seiner bisherigen URL verfügbar. Es entstehen weder eine Bildkonvertierung noch neue Ressourcenabhängigkeiten.

## Bildtransfer beim Start begrenzen

Bei der Installation speichert der Service Worker die vorhandenen kleinen und großen Installationssymbole vorab, ohne zusätzlich das übergroße Quellbild abzurufen. Eine neue Cache-Version aktualisiert die Ressourcenliste bestehender Clients. Die Behandlung privater APIs und von Modulrevisionen bleibt unverändert. Tests der Routen und der Worker-Installation sichern die Bildtransferbudgets ab.

## Commits

- [eaa76ae](https://github.com/Cognis-Labs-HQ/Cognis/commit/eaa76ae32f517fd4b2a52fd1c064aa19720dc9ac)
- [b1fd6cd](https://github.com/Cognis-Labs-HQ/Cognis/commit/b1fd6cd8f41b6b03855eef1f87a21e98989e46b8)
