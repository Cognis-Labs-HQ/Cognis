# Kleineres Shell-Avatarbild

**Feature-Zweig:** perf-shell-avatar-transfer

## Optimierte Grafik wiederverwenden

Die gemeinsame Seitenhülle verwendet jetzt die vorhandene WebP-Grafik als vorübergehendes Konto-Avatarbild. Dadurch sinkt die Bildübertragung beim Laden der Profildaten. Bildabmessungen, Ersetzung durch den Profilanbieter und Navigation bleiben erhalten.

## Bildbudget absichern

Ein Routentest prüft, dass der Platzhalter der Seitenhülle auf ein ausgeliefertes Bild innerhalb seines Übertragungsbudgets verweist. Authentifizierung, private Daten, Modulressourcen und Cache-Richtlinien bleiben unverändert.

## Commits
