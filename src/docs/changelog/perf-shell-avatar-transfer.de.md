# Kleineres Shell-Avatarbild

**Feature-Zweig:** perf-shell-avatar-transfer

## Optimierte Grafik wiederverwenden

Die gemeinsame Seitenhülle verwendet jetzt die vorhandene WebP-Grafik als vorübergehendes Konto-Avatarbild. Dadurch sinkt die Bildübertragung beim Laden der Profildaten. Bildabmessungen, Ersetzung durch den Profilanbieter und Navigation bleiben erhalten.

## Bildbudget absichern

Ein Routentest prüft, dass der Platzhalter der Seitenhülle auf ein ausgeliefertes Bild innerhalb seines Übertragungsbudgets verweist. Authentifizierung, private Daten, Modulressourcen und Cache-Richtlinien bleiben unverändert.

## Commits

- [7ea9b6aeb0c9d33200003b233ca95228293bd369](https://github.com/Cognis-Labs-HQ/Cognis/commit/7ea9b6aeb0c9d33200003b233ca95228293bd369)
