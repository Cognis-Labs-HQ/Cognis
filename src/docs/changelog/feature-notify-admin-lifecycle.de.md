# Sichere Benachrichtigungen

**Feature-Zweig:** feature-notify-admin-lifecycle

## Entwürfe bewusst behalten

Benachrichtigungs- und Rundsendungsentwürfe überstehen erneute Darstellungen derselben Seite. Bleiben erhält ungespeicherte Arbeit; Verwerfen stellt die Anfangswerte wieder her. Nur Benachrichtigung senden oder Rundsendung erstellen veröffentlicht; das allgemeine Speichern der Einstellungen tut dies nicht. Erfolgreiche Übermittlung setzt einen unveränderten Entwurf zurück; neuere Änderungen und abgelehnte Übermittlungen bleiben erhalten.

## Veröffentlichung und Aktualisierung trennen

Laufende Übermittlungen und Statusänderungen können nicht wiederholt werden. Fehler der Rundsendungsaktualisierung werden getrennt von erfolgreichen Änderungen gemeldet; die bisherige Liste bleibt sichtbar. Verspätete Bestätigungsdetails öffnen keine geschlossene oder ersetzte Ansicht erneut. Aktiviert, Deaktiviert und die aktualisierten Anleitungen sind in alle vier unterstützten Sprachen übersetzt.

Eine eigene Aktion Aktualisieren wiederholt nur das Laden der Liste, behält den Entwurf und wiederholt keine erfolgreiche Erstellung oder Statusänderung.

## Commits

- [d3cd50083ed212817eda70f02dbaf59d0adb60a6](https://github.com/Cognis-Labs-HQ/Cognis/commit/d3cd50083ed212817eda70f02dbaf59d0adb60a6)
- [e9aca7eea535a572cdf46c3c5c7a385edd76bef6](https://github.com/Cognis-Labs-HQ/Cognis/commit/e9aca7eea535a572cdf46c3c5c7a385edd76bef6)
