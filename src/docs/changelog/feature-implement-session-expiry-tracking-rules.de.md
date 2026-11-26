# Persönliche Sitzungszeitlimits berücksichtigen

**Feature-Zweig:** feature-implement-session-expiry-tracking-rules

## Persönliche Zeitlimit-Auswahl innerhalb der globalen Grenze beibehalten

Persönliche Sitzungszeitlimits haben Vorrang, wenn sie kürzer als die Administrationsgrenze sind. Beim Anmelden oder Zurücksetzen wird das aktuelle globale Zeitlimit als persönlicher Wert übernommen, anstatt späteren Erhöhungen fortlaufend zu folgen. Eine kürzere globale Grenze senkt und speichert den persönlichen Wert; eine längere lässt ihn unverändert. Die Dauersteuerung bietet nur passende Einheiten an und begrenzt das Zahlenfeld jeder Einheit auf den größten zulässigen ganzzahligen Wert.

## Längere Zeitlimits sicher anwenden

Beim Verlängern eines persönlichen Zeitlimits bleibt die aktuelle Sitzung aktiv und ein Hinweis informiert darüber, dass die Änderung bei der nächsten Anmeldung gilt. Der Countdown aktualisiert seine Farbe in Echtzeit anhand dauerabhängiger Warnfenster: Kurze Sitzungen bieten weiterhin eine nützliche Vorwarnung, während Sitzungen ab vier Wochen erst am letzten Tag orange und in der letzten Stunde rot werden.

## Deaktivierte Ablaufzeiten und die Anmeldung zuverlässig halten

Die globale Einstellung Nie überschreibt jetzt bestehende persönliche Zeitlimits. Ein vorübergehender Fehler beim Normalisieren einer gespeicherten Einstellung verhindert die Anmeldung nicht mehr.

## Version des Gateway-Pakets weitergeben

Das zusammengefasste Cognis-Gateway-Paket und alle davon abhängigen lokalen Komponenten deklarieren jetzt die aktualisierte getestete Version. Dadurch bleiben Workspace-Manifeste und Sperrdatei mit der Änderung am Authentifizierungs-Gateway synchron.

## Änderungen

- [e92abbe](https://github.com/Cognis-Labs-HQ/Cognis/commit/e92abbeda31ee1306beacce0bb7410129536cf00)
