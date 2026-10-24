# Sichere Kontolöschung

**Feature-Zweig:** feature-fix-data-restoration-on-user-deletion

## Gelöschte Konten behalten keine Aktivitäten

Beim Löschen eines Benutzers werden jetzt Mitgliedschaften und Anwesenheiten in Nachrichten, soziale Beziehungen und Beiträge, Unterrichtsdaten, Kalenderdaten sowie Besprechungsteilnahmen dauerhaft entfernt. Die erneute Erstellung desselben Benutzernamens kann deshalb keine privaten Aktivitäten des gelöschten Kontos wiederherstellen.

## Kalenderbereinigung wird zuverlässig abgeschlossen

Beim Löschen eines Kontos werden die Kalender und Termine des Benutzers jetzt sowohl aus dem dauerhaften Speicher als auch aus dem aktiven Kalenderdienst entfernt. Außerdem wird die globale Dateigrößenkonfiguration nicht mehr fälschlicherweise als benutzereigene Einstellung gelöscht. Dadurch wird eine erfolgreiche Kontolöschung nicht mehr als fehlerhafte Anfrage gemeldet.

## Unterhaltungen und Benachrichtigungen werden sicher bereinigt

Gelöschte Benutzer verlassen ihre Gruppenunterhaltungen jetzt mit einem sichtbaren Austrittsereignis, anstatt die Unterhaltungen stillschweigend zu entfernen. Chats werden für ein einziges verbleibendes Mitglied automatisch archiviert und dauerhaft gelöscht, wenn niemand mehr übrig ist. Ein neu erstelltes Konto erhält niemals erneut Zugriff auf eine Einzelunterhaltung des gelöschten Kontos, selbst wenn es denselben Benutzernamen verwendet. Doppelte aktive Unterhaltungen werden weiterhin verhindert, indem nur Räume abgeglichen werden, in denen beide aktuellen Konten Mitglieder sind. Alle internen Benachrichtigungen werden beim Löschen entfernt.

## Nachrichtenanfragen sind klar getrennt

Wiederholte Versuche, dieselbe ausstehende Unterhaltung zu beginnen, senden keine weitere Anfragebenachrichtigung mehr. Der Client verhindert außerdem doppelte Übermittlungen, solange eine Anfrage verarbeitet wird. Anfragebenachrichtigungen verwenden jetzt die eigene Kategorie „Nachrichtenanfragen“, und ausstehende Anfragen erscheinen in der Nachrichten-Seitenleiste unter einer eigenen Überschrift statt zwischen den Unterhaltungen.

## Abgelehnte Anfragen schließen sicher

Beim Ablehnen einer Nachrichtenanfrage wird der Empfänger jetzt aus dem gerade verlassenen Raum weggeleitet, anstatt dessen Verschlüsselungsschlüssel zu laden. Der abgelehnte Raum folgt dem üblichen Chat-Lebenszyklus und wird für den verbleibenden Anfragenden archiviert oder gelöscht, wenn er leer ist.

## Änderungen

- [9735e00](https://github.com/Cognis-Labs-HQ/Cognis/commit/9735e00a2bb3ef7b3a1f10aa49494f81007dece2)
