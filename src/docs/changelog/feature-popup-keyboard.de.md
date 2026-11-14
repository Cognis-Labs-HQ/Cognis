# Dialoge per Tastatur

**Feature-Zweig:** feature-popup-keyboard

## Tastaturnavigation in Dialogen

Jeder Dialog hat eine eigene zugängliche Überschrift, auch verschachtelte Rückfragen zu ungespeicherten Änderungen und mehrseitige Dialoge. Tab und Umschalt+Tab bleiben im aktiven Dialog. Beim Behalten eines Entwurfs kehrt der Fokus zum Editor zurück; beim Schließen des letzten Dialogs zur verfügbaren öffnenden Schaltfläche oder zur Seite, wenn diese fehlt. Leere Dialoge halten den Fokus, bis Bedienelemente verfügbar werden. Ein Abbruch beim Seitenwechsel gibt den Fokus frei, ohne ihn auf die alte Seite zurückzusetzen. Schließanimationen behalten keine Tastatursteuerung. Diese gemeinsamen Bedienelemente gelten auch für Dialoge aus geführten Tutorials.

## Fokus für Tutorial-Schritte

Die ergänzende Fähigkeit `ui:popupFocus` koordiniert Dialoge über `register(overlay, handlers)`, `delegate(overlay, { signal, surfaces, contains, focus, onRevoke })` und `restore(overlay, preferred)`. Die Registrierung gehört zum Dialogrenderer. Ein Tutorial delegiert nur den aktiven Dialog, den sein aktueller Schritt ausdrücklich akzeptiert. Es liefert zulässige Ziele und Bedienelemente, verbundene Oberflächen desselben Dokuments sowie eine Fokusfunktion. Das erforderliche Abbruchsignal, das Entfernen einer Oberfläche oder das Schließen des Dialogs beendet die Delegation. Ein neuerer Dialog behält den exklusiven Fokus, auch vor seiner Einblendanimation. Beim Beenden oder Wiederholen eines Tutorials gilt wieder die normale Tastatursteuerung, ohne eine verworfene Seite erneut zu öffnen. Die Optionen von `openPopup` bleiben unverändert.

Die erforderliche Funktion `onRevoke` entfernt delegierte Ereignisbehandler synchron, bevor der Fokus zurückgegeben wird.

Delegierte Funktionen arbeiten synchron; `contains` muss einen booleschen Wert zurückgeben. Ausnahmen, ungültige Rückgabewerte, asynchrone Ergebnisse oder rekursive Fokusversuche beenden die Delegation, protokollieren sichere Diagnosemetadaten und stellen die normale Fokussteuerung wieder her. Fehler in Funktionen oder Protokollierung dürfen das Schließen eines Dialogs nicht unterbrechen oder dessen Ergebnis offenlassen.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/21ec6fd954055e9850d2883e2561caebf04ac2b4
