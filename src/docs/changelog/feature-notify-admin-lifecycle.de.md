# Sichere Benachrichtigungen

**Feature-Zweig:** feature-notify-admin-lifecycle

## Entwürfe bewusst behalten

Benachrichtigungs- und Rundsendungsentwürfe überstehen erneute Darstellungen derselben Seite. Bleiben erhält ungespeicherte Arbeit; Verwerfen stellt die Anfangswerte wieder her. Nur Benachrichtigung senden oder Rundsendung erstellen veröffentlicht; das allgemeine Speichern der Einstellungen tut dies nicht. Erfolgreiche Übermittlung setzt einen unveränderten Entwurf zurück; neuere Änderungen und abgelehnte Übermittlungen bleiben erhalten.

## Veröffentlichung und Aktualisierung trennen

Laufende Übermittlungen und Statusänderungen können nicht wiederholt werden. Fehler der Rundsendungsaktualisierung werden getrennt von erfolgreichen Änderungen gemeldet; die bisherige Liste bleibt sichtbar. Verspätete Bestätigungsdetails öffnen keine geschlossene oder ersetzte Ansicht erneut. Aktiviert, Deaktiviert und die aktualisierten Anleitungen sind in alle vier unterstützten Sprachen übersetzt.

Eine eigene Aktion Aktualisieren wiederholt nur das Laden der Liste, behält den Entwurf und wiederholt keine erfolgreiche Erstellung oder Statusänderung.

## Commits

- [708ef7aa7f4791e2f307a78cb5f437da0953c500](https://github.com/Cognis-Labs-HQ/Cognis/commit/708ef7aa7f4791e2f307a78cb5f437da0953c500)
- [aa1b214c15ded46590ccec6cd6a05cfcd03f712a](https://github.com/Cognis-Labs-HQ/Cognis/commit/aa1b214c15ded46590ccec6cd6a05cfcd03f712a)
