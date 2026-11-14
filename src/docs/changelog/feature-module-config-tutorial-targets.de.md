# Öffentliche Tutorialziele für Moduleinstellungen

**Feature-Zweig:** feature-module-config-tutorial-targets

## Öffentliche Tutorialziele für Moduleinstellungen

Die öffentliche Fähigkeit ui:moduleTutorialTargets bietet neben card(id) auch settings(id), field(id,key), action(id,key) und preview(id), jeweils an das Signal des Aufrufers gebunden. Einstellungshandles liefern einen Popup-Selektor für die Tutorialautorisierung. bindSettings(id,{signal}) bindet Vorbereitung und Editor an einen Zweig; settingsSignal(id) wird vom besitzenden Editor verwendet. Adaptereinstiege verwenden adapterSettings(gateway,id) und revealAdapter(gateway,id). Nur der Besitzer löst Hostziele auf; schließende oder fremde Popups liefern keine Ziele.

## Commits

- [ad94587](https://github.com/Cognis-Labs-HQ/Cognis/commit/ad945875c919d504058437aab92449d254d79aa8)
