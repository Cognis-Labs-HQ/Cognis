# Schwebende Fenstergesten

**Feature-Zweig:** feature-floating-gestures643

## Eine Geste behält die Kontrolle

Ein schwebendes Fenster akzeptiert jeweils eine Verschiebe- oder Größenänderungsgeste. Weitere Berührungen ersetzen sie nicht. Das Loslassen oder Abbrechen des zugehörigen Zeigers oder der Verlust seiner Erfassung beendet nur diese Geste und behält Position und Größe bei. Danach kann eine neue Geste beginnen.

## Fensterlebensdauer erhalten

Die zurückgegebene Funktion `release()` und ein optionales Abbruchsignal des Aufrufers entfernen das schwebende Verhalten und geben die Zeigererfassung frei; sie entfernen keine Inhalte des Aufrufers und rufen nicht den Schließen-Rückruf auf. Nur das ausdrückliche Schließen-Steuerelement ruft diesen Rückruf auf. Das Signal muss zur vorgesehenen Fensterlebensdauer passen: Dauerhaftes Anruf-PiP lässt das Seitensignal bewusst weg; Routenmeldungen allein schließen es nicht.

Bestehende Ziele, Schritte und Aktionen der Fokus- und Zeichentutorials bleiben unverändert; unterbrochene Gesten benötigen keinen neuen Tutorialzweig.

## Commits

- [5e0e79109017d679f1e7db50998ffa470d55e5af](https://github.com/Cognis-Labs-HQ/Cognis/commit/5e0e79109017d679f1e7db50998ffa470d55e5af)
