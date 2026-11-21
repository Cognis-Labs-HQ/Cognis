# Bereinigung beim Dialogstart

**Feature-Zweig:** feature-popup-opening-integrated638

## Fehlgeschlagene Dialoge geben die Seite frei

Ein synchroner Fehler bei der anfänglichen Dialogeinrichtung entfernt den fehlgeschlagenen Dialog und gibt Fokus, Ereignislistener, Timer, Änderungserfassung und Bildlaufsperre frei, bevor der ursprüngliche Fehler zurückgegeben wird. Eine ausstehende Verwerfungsbestätigung wird mit ihrem fehlgeschlagenen Besitzer abgebrochen. Die Bildvorschau nutzt dieselbe gemeinsame Bereinigung, ohne Übersetzungsfehler zu unterdrücken.

## Bestehende Bedienung bleibt erhalten

Aktive übergeordnete Dialoge und neuere Öffnungen behalten ihre eigene Kontrolle. Erneutes Schließen oder Abbrechen aus einem Callback erhält ein bereits abgeschlossenes Ergebnis. Normale Animationen, verpflichtende Dialoge, Aktions-Callbacks, Änderungsbestätigungen, Seitenwechsel sowie Tutorial-Ziele, Steuerelemente und Wiederholung behalten ihre Verträge. Initialisierungen bleiben synchron; zurückgegebene Promises werden nicht abgewartet. Die gemeinsame UI hat keine eigene Paketversion.

## Commits

- [3f7f66637a28f7f73411e557fe6d90c94e60ef45](https://github.com/Cognis-Labs-HQ/Cognis/commit/3f7f66637a28f7f73411e557fe6d90c94e60ef45)
- [1e19a0040518af575759196659d91a8119ef9362](https://github.com/Cognis-Labs-HQ/Cognis/commit/1e19a0040518af575759196659d91a8119ef9362)
