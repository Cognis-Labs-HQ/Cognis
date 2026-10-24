# Kleinere Markensymbole

**Feature-Zweig:** perf-small-brand-icons

## Auflösung je Oberfläche

Seiten-Favicons, Dashboard-Widgets, Anmelde- und Fehleransichten sowie Verknüpfungen verwenden ein 384px-Bild. Die Kopfzeile nutzt das vorhandene 512px-Symbol. Normale und maskierbare 384px-Varianten werden mit Lanczos deterministisch aus den entsprechenden 512px-Bildern verkleinert; Bildaufbau, Seitenverhältnis und Alpha bleiben erhalten. Originalbilder und plattformspezifische Installationssymbole (192px/512px sowie 180px für Apple Touch) bleiben verfügbar.

## Bildtransfer beim Start

Der Service Worker speichert normale Symbole in 192px, 384px und 512px vorab, ohne das große Quellbild abzurufen. Die neue Cache-Version aktualisiert die Ressourcenliste. Routen- und Installationstests prüfen Bildgrößen und die zugunsten der Qualität erhöhten Transferbudgets mit injizierten Authentifizierungsverträgen, ohne gespeicherte Tokens anzulegen.

## Commits

- [eaa76ae](https://github.com/Cognis-Labs-HQ/Cognis/commit/eaa76ae32f517fd4b2a52fd1c064aa19720dc9ac)
- [b1fd6cd](https://github.com/Cognis-Labs-HQ/Cognis/commit/b1fd6cd8f41b6b03855eef1f87a21e98989e46b8)
- [0d6fbe8](https://github.com/Cognis-Labs-HQ/Cognis/commit/0d6fbe8efa1621057a43e721b949beca339cdf82)
