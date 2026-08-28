# Popup-Dirty-Checks

**Feature Branch:** copilot/add-dirty-tracker-check

## Schließhinweise erst nach Änderungen

Geschützte Formular-Popups prüfen jetzt zuerst den gemeinsamen Dirty-Tracker, bevor die Bestätigung zum Verwerfen geöffnet wird. Wer ein Formular direkt wieder schließt, sieht die Warnung nicht mehr, solange nichts geändert wurde.

## Stille Verfolgung für Popups

Die gemeinsame Unsaved-Changes-Hilfe kann Popup-Formularfelder jetzt in einem stillen Modus verfolgen, der die schwebenden Speichern-/Verwerfen-Steuerelemente verborgen hält. So nutzt der Schließschutz dieselbe Dirty-State-Logik ohne zusätzliche UI.

## Commits

- [88648cc](https://github.com/Cognis-Labs-HQ/Cognis/commit/88648cc411c93eaad6bba45e142bede90dbe5b0c)
