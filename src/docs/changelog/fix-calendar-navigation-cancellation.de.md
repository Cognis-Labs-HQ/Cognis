# Alte Kalenderaufrufe stoppen

**Feature-Zweig:** fix-calendar-navigation-cancellation

## Alte Kalenderaufrufe stoppen

Beim Verlassen des Kalenders wird überholte Initialisierung vor Änderungen an Seite oder URL beendet. Das Routensignal erreicht den Seitenaufbau; verspätete Kalender-, Ereignis- und Einladungsantworten können eine bereits ersetzte Zielseite nicht erneut aufbauen. Abgebrochene Initialisierung zeigt keine verspätete Fehlermeldung und startet den Verfügbarkeitstimer nicht erneut.

## Commits
