# Schreibübung

## Zweck

Der Drawing-Adapter stellt `study:drawing:open` im Browser-`uiCtx` bereit. Aufrufer übergeben eine vollständige Library-Karte und ihr validiertes `strokePattern`; der Adapter öffnet ein bewegliches, skalierbares PiP-Schreibfeld.

## Übungsmodell

Das Feld unterstützt Stift, Touch und Maus, prüft die vom Anbieter festgelegte Strichreihenfolge, bewertet Richtung und Pfadnähe, verfolgt abgeschlossene Striche, bietet Rückgängig/Zurücksetzen und vier Hilfestufen von freiem Abruf bis zum vollständigen Muster.

Die Strichbewertung tastet beide Pfade gleichmäßig neu ab und kombiniert punktweise RMS-Abweichung, Endpunktposition, Richtung und Längenverhältnis; dadurch bleibt sie auch bei dichten komplexen Zeichen stabil. Die Hilfestufe wird automatisch aus der Erfolgsquote und der Rückmeldung „Leicht/Schwierig“ bestimmt. Das PiP fordert Abmessungen an, die quadratische Zeichenfläche und Steuerungen aufnehmen, skaliert die Zeichenfläche in beiden Achsen unabhängig und folgt dem aktiven hellen oder dunklen Design.
