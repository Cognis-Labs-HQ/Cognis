# Study-Navigation

Flashcards verwendet `/study/<iso>/flashcards` und `/study/<iso>/flashcards/<deck-id>`. Die Sprachsteuerung öffnet die entsprechende Galerie und übernimmt kein fremdsprachiges Deck. `/study/flashcards` löst die aktuelle Sprache auf. Bibliothek und Anfragen bleiben gemeinsame Seiten.

## Anwendungsbeispiele

Öffnen Sie `/study/ja/flashcards` für japanische Decks; Englisch öffnet `/study/en/flashcards`.

## Technische Spezifikation

Sprachgalerien bestimmen die Sprache aus dem Pfad und filtern sichtbare Decks über den öffentlichen Study-Vertrag. Deckdetails identifizieren Sprache und Deck-UUID; ein Sprachwechsel öffnet die entsprechende Galerie. Flüchtige Abfragedaten werden nicht in Navigations-URLs übernommen.
