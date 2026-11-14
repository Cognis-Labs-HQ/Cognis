# Öffentliche Tutorialziele für Moduleinstellungen

**Feature-Zweig:** feature-module-config-tutorial-targets

## Öffentliche Tutorialziele für Moduleinstellungen

Die öffentliche Fähigkeit ui:moduleTutorialTargets bietet neben card(id) auch settings(id), field(id,key), action(id,key) und preview(id), jeweils an das Signal des Aufrufers gebunden. Einstellungshandles liefern einen Popup-Selektor für die Tutorialautorisierung. bindSettings(id,{signal}) bindet Vorbereitung und Editor an einen Zweig; settingsSignal(id) wird vom besitzenden Editor verwendet. Adaptereinstiege verwenden adapterSettings(gateway,id) und revealAdapter(gateway,id). Nur der Besitzer löst Hostziele auf; schließende oder fremde Popups liefern keine Ziele.

## Die veröffentlichten Popup-Verträge verwenden

Einstellungen werden über die geschützte Schließfunktion aus onOpen geschlossen; requestClose steht nur in onAction bereit. Tests bilden diese Unterscheidung ab. Generische und eigene Adaptereditoren veröffentlichen Gateway- und Adapterkennung über den übergebenen Popup-Wrapper, passend zum Selektor aus adapterSettings(). Verschachtelte Bestätigungen behalten ihre eigene Identität.

## Adaptereditoren vor der Zielanbindung binden

Der übergebene Adapter-Popup-Wrapper übernimmt das erfasste Tutorialsignal zu Beginn jedes Öffnungsvorgangs. Beim Abbruch fordert er geschütztes Schließen an, auch wenn noch kein späteres Tutorialziel angebunden ist und ein eigener Editor das Signal nicht selbst verarbeitet. Ein Abbruch während der Vorbereitung wird in onOpen erneut geprüft; beim Abschluss werden Listener entfernt.

## Commits

- [ad94587](https://github.com/Cognis-Labs-HQ/Cognis/commit/ad945875c919d504058437aab92449d254d79aa8)
- [40d61ed](https://github.com/Cognis-Labs-HQ/Cognis/commit/40d61eded176b472f7040dbfcdb34d7d0067107d)
- [f9fc6e2](https://github.com/Cognis-Labs-HQ/Cognis/commit/f9fc6e2b8ac572bd04bd68a3d9e1fc7fc0e34fd7)
