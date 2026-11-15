# Bereinigung beim Dialogstart

**Feature-Zweig:** feature-popup-opening-integrated638

## Fehlgeschlagene Dialoge geben die Seite frei

Ein synchroner Fehler bei der anfänglichen Dialogeinrichtung entfernt den fehlgeschlagenen Dialog und gibt Fokus, Ereignislistener, Timer, Änderungserfassung und Bildlaufsperre frei, bevor der ursprüngliche Fehler zurückgegeben wird. Eine ausstehende Verwerfungsbestätigung wird mit ihrem fehlgeschlagenen Besitzer abgebrochen. Die Bildvorschau nutzt dieselbe gemeinsame Bereinigung, ohne Übersetzungsfehler zu unterdrücken.

## Bestehende Bedienung bleibt erhalten

Aktive übergeordnete Dialoge und neuere Öffnungen behalten ihre eigene Kontrolle. Erneutes Schließen oder Abbrechen aus einem Callback erhält ein bereits abgeschlossenes Ergebnis. Normale Animationen, verpflichtende Dialoge, Aktions-Callbacks, Änderungsbestätigungen, Seitenwechsel sowie Tutorial-Ziele, Steuerelemente und Wiederholung behalten ihre Verträge. Initialisierungen bleiben synchron; zurückgegebene Promises werden nicht abgewartet. Die gemeinsame UI hat keine eigene Paketversion.

## Commits

- [d3cde8f4eb18f2b646fe2fdd9128513db9d5365d](https://github.com/Cognis-Labs-HQ/Cognis/commit/d3cde8f4eb18f2b646fe2fdd9128513db9d5365d)
- [c6f12076f510b9853f0a9a63a1777f4a1138cd48](https://github.com/Cognis-Labs-HQ/Cognis/commit/c6f12076f510b9853f0a9a63a1777f4a1138cd48)
- [31ad1f9de89eb8a9daf6afd13dbeec42b6cee9fc](https://github.com/Cognis-Labs-HQ/Cognis/commit/31ad1f9de89eb8a9daf6afd13dbeec42b6cee9fc)
