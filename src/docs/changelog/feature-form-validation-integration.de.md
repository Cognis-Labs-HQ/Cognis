# Zugängliche Formularprüfung

**Feature-Zweig:** feature-form-validation-integration

## Ausgewertete Fehler erklären

Fehlgeschlagene benutzerdefinierte Prüfungen kennzeichnen das betroffene Eingabefeld und verknüpfen vorhandene übersetzte Anforderungen, ohne Beschreibungen des Aufrufers zu ersetzen. Eine Korrektur entfernt die eigene Fehlerzuordnung. Native Einschränkungen, Pflichtfeldmarker, Registernavigation und Formularübermittlung behalten ihre bisherigen Verträge.

## Validierungslistener beenden

Trennen oder Abbrechen einer Formularanbindung entfernt deren Listener für Eingabe, Änderung und Fokusverlust sowie eigene ARIA-Zustände. Erneutes Anbinden verdoppelt alte Listener nicht. Ausdrückliche Validierungsaufrufe bleiben möglich.

## Gemeinsame Anleitung ergänzen

Die vier UI-Anleitungen dokumentieren Validierung und bestehende Tutorial-Abdeckung. Tests prüfen öffentliche Formular-Einstiegspunkte und die tatsächlichen Passwortdialog-Kriterien mit synthetischen Richtlinienabfragen und ausschließlich Abbruch.

## Spätere Aufruferfehler erhalten

Wiederholte ungültige Prüfungen erhalten den zuletzt vom Aufrufer gesetzten oder entfernten ARIA-Fehlerwert. Korrektur, Trennen und Abbrechen stellen diesen Zustand wieder her, ohne andere Beschreibungen zu ersetzen. Ein identischer Wert true lässt sich keinem anderen Eigentümer zuordnen.

## Unterbrochene Darstellung beenden

Trennt oder beendet ein benutzerdefiniertes Kriterium seine Formularanbindung, liefert die laufende Feld- oder Gesamtformularprüfung ihr Ergebnis, ohne die Darstellung nach der Bereinigung wiederherzustellen. Eine spätere ausdrückliche Validierung bleibt möglich; erneutes Trennen entfernt ihren Zustand.

## Commits

- [47f407cd521a3e58adf7c371977970a0b7d5d0d2](https://github.com/Cognis-Labs-HQ/Cognis/commit/47f407cd521a3e58adf7c371977970a0b7d5d0d2)
- [8b78edeee17d2959ba6d93f290cd4ecded080b8c](https://github.com/Cognis-Labs-HQ/Cognis/commit/8b78edeee17d2959ba6d93f290cd4ecded080b8c)
- [27f332f3075194ce66dac482f706a9705f3cfd57](https://github.com/Cognis-Labs-HQ/Cognis/commit/27f332f3075194ce66dac482f706a9705f3cfd57)
- [1bd071a27173f7e7a684832b8c3f4d31445d7a9b](https://github.com/Cognis-Labs-HQ/Cognis/commit/1bd071a27173f7e7a684832b8c3f4d31445d7a9b)
