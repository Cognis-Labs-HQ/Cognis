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

- [def09ee4825dd0fb636b56cbdecc8b2e6a3f1920](https://github.com/Cognis-Labs-HQ/Cognis/commit/def09ee4825dd0fb636b56cbdecc8b2e6a3f1920)
- [80d2e9190e3eb12d273378259384a327c1d5c55c](https://github.com/Cognis-Labs-HQ/Cognis/commit/80d2e9190e3eb12d273378259384a327c1d5c55c)
- [aef6aebc79a43bb30c1f9c53d86de0aec893c165](https://github.com/Cognis-Labs-HQ/Cognis/commit/aef6aebc79a43bb30c1f9c53d86de0aec893c165)
- [c101aaba5e70c5ef79ec79940a5d8eef86466c40](https://github.com/Cognis-Labs-HQ/Cognis/commit/c101aaba5e70c5ef79ec79940a5d8eef86466c40)
