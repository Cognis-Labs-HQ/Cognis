# Schreibübung

## Zweck

Der Drawing-Adapter stellt `study:drawing:open` im Browser-`uiCtx` bereit. Aufrufer übergeben eine vollständige Library-Karte und ihr validiertes `strokePattern`; der Adapter öffnet ein bewegliches, skalierbares PiP-Schreibfeld.

## Übungsmodell

Das Feld unterstützt Stift, Touch und Maus, prüft die vom Anbieter festgelegte Strichreihenfolge, bewertet Richtung und Pfadnähe und ersetzt jede akzeptierte Eingabe durch den kanonischen Strich des Anbieters. Zu Beginn eines Versuchs sind alle Striche sichtbar. Nach dem ersten akzeptierten Strich zeigt das Feld nur noch den jeweils nächsten erforderlichen Strich und behält die abgeschlossenen kanonischen Striche bei.

Falsche Striche erzeugen eine zurückhaltende rote Rückmeldung, ohne die Öffnungsanimation des Feldes neu zu starten. Nach Abschluss des Zeichens ertönt ein kurzer Erfolgsklang und eine stabile Abschlussanzeige zeigt ein Häkchen, die Fehlerzahl des Versuchs sowie die Aktionen Schließen und Erneut versuchen. Erneut versuchen beginnt einen neuen Versuch mit allen sichtbaren Vorgaben. Zeigereingaben werden höchstens einmal pro Animationsbild gezeichnet, damit die Zeichenfläche stabil bleibt.

Die Überschrift wird an der gerenderten Zeichenfläche gemessen und direkt darüber zentriert. Kartentext und lokalisierte Definition bleiben ausgerichtet, und die inhaltsgroße Schließen-Schaltfläche verwendet eine eigene Schließanimation.

Die erste Hilfsansicht nummeriert jeden Strich und zeigt seine Richtung. Zehn aufeinanderfolgende Fehler beenden den Versuch mit einem Misserfolg. Erfolgreiche Versuche mit höchstens einem Fehler erhöhen den im Speicher gehaltenen Schwierigkeitsgrad dieser Karte für spätere Versuche; außerdem kann ein geöffnetes Zeichenfeld direkt zu einer anderen Bibliothekskarte wechseln.
