# Zeichenübungen korrigiert

**Feature-Zweig:** feature-update-external-package-contract-definitions

## Unbekannte Lesungen zulassen

Schreibzeichen-Schemas behalten die Standardtypen für Aussprache und Audio bei; Anbieter dürfen Aussprachewerte jedoch optional machen. Japanische Pakete lassen sich ohne erfundene Lesungen aktivieren. Pflichtwerte und ungültige Typen werden weiterhin geprüft.

## Einheitliche Zeichenfenster

Schwebende Zeichenfelder öffnen sich in einem großen Rahmen, unabhängig vom Seitenverhältnis des Worts oder Musters. Kartenwechsel erhalten Position und manuelle Größenänderungen; Zeichnungen behalten ihre Proportionen.

## Einheitliche Strichführung

Vor der ersten Eingabe zeigt ein noch nicht abgeschlossenes Muster alle Striche. Danach wird über alle Zeichengrenzen hinweg nur der nächste Strich geführt. Bereits abgeschlossene Muster beginnen mit dem nächsten Strich; ausgeblendete Striche zur Wissensprüfung und die Aufdeckfunktion bleiben erhalten.

## Zeichenfortschritt speichern

Abschluss und Anzahl der auszublendenden Striche werden über den Präferenzspeicher je Konto und Karte gespeichert. Jeder Versuch, jedes Zurücksetzen und jede Wiederholung wählt neue zufällige, unterschiedliche Positionen anhand dieser Anzahl. Ein erfolgreicher Abschluss mit höchstens einem Fehler erhöht die Anzahl um eins, begrenzt auf die aktuelle Strichzahl. Abgeschlossene Muster zeigen nur den nächsten Strich; nicht abgeschlossene Muster zeigen vor der Eingabe das gesamte Muster. Authentifizierte GET- und POST-Anfragen an `/api/v1/study/drawing/:cardId` durchlaufen `study:drawing:readProgress` und `study:drawing:complete`; der Browser übermittelt keine Kontoidentität.

## Commits

- [7c13999](https://github.com/Cognis-Labs-HQ/Cognis/commit/7c139996e214333425b23342aae45de133d2bbab)
- [a36941c](https://github.com/Cognis-Labs-HQ/Cognis/commit/a36941c258afaa3b6c528fabfb80b8c3a1fc211d)
