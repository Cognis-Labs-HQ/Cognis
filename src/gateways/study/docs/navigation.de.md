# Study-Navigation

Flashcards verwendet `/study/<iso>/flashcards` und `/study/<iso>/flashcards/<deck-id>`. Die Sprachsteuerung öffnet die entsprechende Galerie und übernimmt kein fremdsprachiges Deck. `/study/flashcards` löst die aktuelle Sprache auf. Bibliothek und Anfragen bleiben gemeinsame Seiten.

## Anwendungsbeispiele

Öffnen Sie `/study/ja/flashcards` für japanische Decks; Englisch öffnet `/study/en/flashcards`.

## Technische Spezifikation

Sprachgalerien bestimmen die Sprache aus dem Pfad und filtern sichtbare Decks über den öffentlichen Study-Vertrag. Deckdetails identifizieren Sprache und Deck-UUID; ein Sprachwechsel öffnet die entsprechende Galerie. Flüchtige Abfragedaten werden nicht in Navigations-URLs übernommen.

Study verwendet für adaptereigene Links wie Anfragen die lokalisierten `navigationLabels` aktiver Adapterrouten. Deren Übersetzungsschlüssel werden nicht über das Sprachpaket des Gateways aufgelöst. Die Auswahl erfolgt nach genauer UI-Sprache, Basissprache und anschließend Englisch; Study-eigene Links verwenden weiterhin die XML-Ressourcen des Gateways.

## Einheitliche Zeichenfenster

Schwebende Zeichenfelder öffnen sich in einem großen Rahmen, unabhängig vom Seitenverhältnis des Worts oder Musters. Kartenwechsel erhalten Position und manuelle Größenänderungen; Zeichnungen behalten ihre Proportionen.

## Einheitliche Strichführung

Vor der ersten Eingabe zeigt ein noch nicht abgeschlossenes Muster alle Striche. Danach wird über alle Zeichengrenzen hinweg nur der nächste Strich geführt. Bereits abgeschlossene Muster beginnen mit dem nächsten Strich; ausgeblendete Striche zur Wissensprüfung und die Aufdeckfunktion bleiben erhalten.

## Zeichenfortschritt speichern

Abschluss und Anzahl der auszublendenden Striche werden über den Präferenzspeicher je Konto und Karte gespeichert. Jeder Versuch, jedes Zurücksetzen und jede Wiederholung wählt neue zufällige, unterschiedliche Positionen anhand dieser Anzahl. Ein erfolgreicher Abschluss mit höchstens einem Fehler erhöht die Anzahl um eins, begrenzt auf die aktuelle Strichzahl. Abgeschlossene Muster zeigen nur den nächsten Strich; nicht abgeschlossene Muster zeigen vor der Eingabe das gesamte Muster. Authentifizierte GET- und POST-Anfragen an `/api/v1/study/drawing/:cardId` durchlaufen `study:drawing:readProgress` und `study:drawing:complete`; der Browser übermittelt keine Kontoidentität.
