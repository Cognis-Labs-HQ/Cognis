# Schreibübung

## Zweck

Der Drawing-Adapter stellt `study:drawing:open` im Browser-`uiCtx` bereit. Aufrufer übergeben eine vollständige Library-Karte und ihr validiertes `strokePattern`; der Adapter öffnet ein bewegliches, skalierbares PiP-Schreibfeld.

## Übungsmodell

Das Feld unterstützt Stift, Touch und Maus, prüft die vom Anbieter festgelegte Strichreihenfolge, bewertet Richtung und Pfadnähe, verfolgt abgeschlossene Striche, bietet Rückgängig/Zurücksetzen und vier Hilfestufen von freiem Abruf bis zum vollständigen Muster.

Die Strichbewertung tastet beide Pfade gleichmäßig neu ab und kombiniert punktweise RMS-Abweichung, Endpunktposition, Richtung und Längenverhältnis; dadurch bleibt sie auch bei dichten komplexen Zeichen stabil. Beim ersten Versuch ist das vollständige Muster sichtbar, ohne Hilfesteuerungen oder Zähler einzublenden. Der erste aufeinanderfolgende Fehler zeigt den erwarteten Strich, weitere Fehler zusätzlich den nächsten und schließlich das vollständige Muster. Falsche Striche lösen ein rotes Schütteln aus; ein vollständig geschriebenes Zeichen ein grünes Schütteln und einen kurzen erzeugten Erfolgsklang. Das PiP fordert Abmessungen an, die quadratische Zeichenfläche und Steuerungen aufnehmen, skaliert die Zeichenfläche in beiden Achsen unabhängig und folgt dem aktiven hellen oder dunklen Design.
