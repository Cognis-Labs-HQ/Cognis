# Schreibübung

## Zweck

Der Drawing-Adapter stellt `study:drawing:open` im Browser-`uiCtx` bereit. Aufrufer übergeben eine vollständige Library-Karte und ihr validiertes `strokePattern`; der Adapter öffnet ein bewegliches, skalierbares PiP-Schreibfeld.

## Übungsmodell

Das Feld unterstützt Stift, Touch und Maus, prüft die vom Anbieter festgelegte Strichreihenfolge, bewertet Richtung und Pfadnähe, verfolgt abgeschlossene Striche und bietet Zurücksetzen, ohne die erlernte Hilfestufe rückgängig zu machen.

Nur der aktuelle Strich wird vorgegeben. Sein vollständiger Pfad ist anfangs sichtbar; erfolgreiche Striche verkürzen die spätere Hilfe schrittweise, während wiederholte Fehler die aktuelle Vorgabe vom Anfang bis zum Endpunkt verlängern. Zurücksetzen löscht die geschriebenen Striche, ohne den früheren Umfang der Hilfe wiederherzustellen. Falsche Striche lösen ein rotes Schütteln aus; ein vollständiges Zeichen ein grünes Schütteln und einen kurzen erzeugten Erfolgsklang. In der Überschrift stehen Kartentext und lokalisierte Definition nebeneinander; die inhaltsgroße Schließen-Schaltfläche ist in die Öffnungs- und Schließanimation eingebunden.
