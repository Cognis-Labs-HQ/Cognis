# Dialogaktionen

**Feature-Zweig:** feature-popup-action-contracts

## Fokussierte Aktionen beachten

Eingabe und Leertaste bleiben beim fokussierten Bedienelement. Aufbauende einzeilige Aktionen bleiben verfügbar, ohne CSS-Klassen oder Aktionskennungen als Berechtigung zu verwenden. Native Formularprüfung, Bearbeitung, IME-Eingabe, Tutorial-Fokus und verschachtelte Lebenszyklen bleiben erhalten.

## Entwürfe sicher behalten

Rückfragen zu ungespeicherten Änderungen fokussieren sicheres Abbrechen und kennzeichnen Verwerfen als destruktiv. Wiederholte, laufende und veraltete Aktionen lösen keinen doppelten Callback aus; ausdrückliches Schließen bleibt möglich.

## Dialogfußzeilen vereinheitlichen

Erste, ersetzte und neu hinzugefügte Fußzeilen verwenden denselben nativen Schaltflächenrenderer und Wirkungsklassen, einschließlich neutralem Fertig. Neutrale Bedienelemente behalten ihre Dialogdarstellung und nutzen gemeinsame Umbruch- und Berührungsflächenregeln. Dies deckt den gemeinsamen Dialogteil von #542 und #330 ab; die umfassende Aufruferprüfung und native Browser-Layoutprüfung bleiben getrennt.

## Commits

- [4cc2a248c7dddc891be883cb7ac68e882e288960](https://github.com/Cognis-Labs-HQ/Cognis/commit/4cc2a248c7dddc891be883cb7ac68e882e288960)
