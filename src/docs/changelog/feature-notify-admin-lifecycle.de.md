# Sichere Benachrichtigungen

**Feature-Zweig:** feature-notify-admin-lifecycle

## Entwürfe bewusst behalten

Benachrichtigungs- und Rundsendungsentwürfe überstehen erneute Darstellungen derselben Seite. Bleiben erhält ungespeicherte Arbeit; Verwerfen stellt die Anfangswerte wieder her. Nur Benachrichtigung senden oder Rundsendung erstellen veröffentlicht; das allgemeine Speichern der Einstellungen tut dies nicht. Erfolgreiche Übermittlung setzt einen unveränderten Entwurf zurück; neuere Änderungen und abgelehnte Übermittlungen bleiben erhalten.

## Veröffentlichung und Aktualisierung trennen

Laufende Übermittlungen und Statusänderungen können nicht wiederholt werden. Fehler der Rundsendungsaktualisierung werden getrennt von erfolgreichen Änderungen gemeldet; die bisherige Liste bleibt sichtbar. Verspätete Bestätigungsdetails öffnen keine geschlossene oder ersetzte Ansicht erneut. Aktiviert, Deaktiviert und die aktualisierten Anleitungen sind in alle vier unterstützten Sprachen übersetzt.

Eine eigene Aktion Aktualisieren wiederholt nur das Laden der Liste, behält den Entwurf und wiederholt keine erfolgreiche Erstellung oder Statusänderung.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/ca8faf9a2c750e9e82cf2ee5ada603053b0103cc
