# Vom Anbieter definierte PiP-Mindestgrößen berücksichtigen

**Feature-Zweig:** feature-honor-minimum-size-in-pip-window

## PiP-Abmessungen aus Metadaten durchsetzen

Focus Control validiert nun die von Anbietern deklarierten Metadaten für Mindestbreite und -höhe und übergibt diese Maße an die Floating-Window-Steuerung, damit skalierte PiP-Fenster die nutzbare Mindestgröße des Anbieters beibehalten.

## PiP-Mindestgrößen im geöffneten Zustand aktualisieren

PiP-Verbraucher können nun die Mindestabmessungen eines schwebenden Fensters über dessen Bereinigungsfunktion aktualisieren. Ist das geöffnete Fenster kleiner als ein neues gültiges Minimum, vergrößert und positioniert Cognis es sofort innerhalb des verfügbaren Bereichs neu.

## Änderungen

- [f38004f](https://github.com/Cognis-Labs-HQ/Cognis/commit/f38004f3247f8a9c00277cf0f727615d55d1ccc5)
- [1d32579](https://github.com/Cognis-Labs-HQ/Cognis/commit/1d3257996e889a1a23fd7ebd316a0c280b7ebee3)
- [094c44d](https://github.com/Cognis-Labs-HQ/Cognis/commit/094c44dbc1be75bd716e3522942f694315a90722)
