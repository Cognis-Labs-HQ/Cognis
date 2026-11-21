# Schwebende Fenstergesten

**Feature-Zweig:** feature-floating-gestures643

## Eine Geste behält die Kontrolle

Ein schwebendes Fenster akzeptiert jeweils eine Verschiebe- oder Größenänderungsgeste. Weitere Berührungen ersetzen sie nicht. Das Loslassen oder Abbrechen des zugehörigen Zeigers oder der Verlust seiner Erfassung beendet nur diese Geste und behält Position und Größe bei. Danach kann eine neue Geste beginnen.

## Fensterlebensdauer erhalten

Die zurückgegebene Funktion `release()` und ein optionales Abbruchsignal des Aufrufers entfernen das schwebende Verhalten und geben die Zeigererfassung frei; sie entfernen keine Inhalte des Aufrufers und rufen nicht den Schließen-Rückruf auf. Nur das ausdrückliche Schließen-Steuerelement ruft diesen Rückruf auf. Das Signal muss zur vorgesehenen Fensterlebensdauer passen: Dauerhaftes Anruf-PiP lässt das Seitensignal bewusst weg; Routenmeldungen allein schließen es nicht.

Bestehende Ziele, Schritte und Aktionen der Fokus- und Zeichentutorials bleiben unverändert; unterbrochene Gesten benötigen keinen neuen Tutorialzweig.

## Commits

- [73040a8f0a1c14ddc0be243655e450d3a7db8598](https://github.com/Cognis-Labs-HQ/Cognis/commit/73040a8f0a1c14ddc0be243655e450d3a7db8598)
- [e8f4f04019d75da644ce3d37df4e2624f10f4e32](https://github.com/Cognis-Labs-HQ/Cognis/commit/e8f4f04019d75da644ce3d37df4e2624f10f4e32)
