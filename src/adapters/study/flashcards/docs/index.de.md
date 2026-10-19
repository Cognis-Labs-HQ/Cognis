# Lernkartenadapter

## Verwendung

Ein sichtbarer Stapel öffnet sofort die Übung. Gesamt, Erledigt, Fällig und Neu bestimmen die Lernkarten.

## Technische Spezifikation

Stapel verwenden den Ressourcentyp `studyDeck` und die Leseberechtigung `study:flashcards:read`. Die Cognis-Freigabe unterstützt Benutzer, öffentliche Links, Ablauf, Passwörter und Widerruf. Nur Eigentümer bearbeiten oder löschen Stapel. Empfänger lernen mit getrennten Kontolernplänen; nur Ersteller oder Administratoren exportieren. Linkgäste lernen vorübergehend ohne Änderung eines Kontolernplans. Jede Stapeloperation prüft Ablauf und Widerruf.

Eine Freigabe gewährt stapelbezogenen Zugriff auf aktuelle Bibliothekskarten und Definitionen, ohne allgemeinen Bibliothekszugriff oder Bereichsänderung. Nach der Freigabeprüfung werden die IDs mit den Berechtigungen des Eigentümers aufgelöst. Nicht verfügbare Karten und Inhalte deaktivierter Anbieter werden ausgelassen. Galeriedaten und Bewertungsantworten enthalten keine gespeicherten Kartenkopien. Beim Löschen werden Freigaben widerrufen sowie Lernzeitpläne und Empfangsbestätigungen entfernt.

Import und Export verwenden UTF-8-Text mit zitierten, tabulatorgetrennten Spalten Front, Back und optional Pronunciation. Exporte enthalten Anki-Kopfzeilen für Trennzeichen, Stapel und Klartext sowie optionalen Cognis-Kontext. Anki kann diese Zusatzspalte ignorieren. Anführungszeichen, Tabulatoren und Zeilenumbrüche bleiben erhalten. Es handelt sich um TSV-Austausch, nicht um `.apkg`-Archive. Privater Lernfortschritt wird nicht exportiert.

## Study-Ansicht und Favoriten

Flashcards öffnet eine Übersicht eigener Decks, mit dem Konto geteilter Decks und vollständiger Startdecks aktivierter Sprachanbieter. Linkfreigaben behalten ihre Zugriffsregeln und bilden kein öffentliches Verzeichnis. Das +-Menü rechts oben bietet Deck erstellen und Deck importieren. Erkunden, Library und Flashcards verwenden gespeicherte Study-Favoriten und gemeinsame Sortierung (Anbieterreihenfolge, A–Z, Z–A, neueste oder älteste zuerst). Der goldene Stern filtert die Ergebnisse nach Favoriten. Library-Einträge, Decks und einzelne Lernkarten haben getrennte Favoriten. Favoriten gewähren keinen zusätzlichen Zugriff. Das Zeichenfeld beendet seine Sitzung bei Routenwechseln und überschreibt keine Composer- oder Shell-Klassen.

## Startdecks von Anbietern

Ein Sprachdeskriptor kann `starterDecks` mit `{ key, name, schemaId, sourceRecordIds }` deklarieren. Der Schlüssel bleibt innerhalb des Pakets stabil, Namen sind lokalisiert und bis zu 500 eindeutige Quelldatensatzschlüssel legen die Lernreihenfolge fest. Cognis löst globale Library-Einträge zu kanonischen Library-IDs auf. Deck-IDs bleiben bei Inhaltsrevisionen stabil. Unvollständige Decks und deaktivierte Anbieter werden ausgelassen. Startdecks sind schreibgeschützt; Lernfortschritt und Favoriten bleiben persönlich. Erst beim Öffnen werden Kartendetails geladen.

Flashcards lädt die gemeinsamen Stylesheets page-builder und page-sections wie Explore und Requests. Jeder Seitenaufruf besitzt einen abbrechbaren Interaktionsbereich, damit alte Ansichts- und Lernhandler nach Navigation nicht aktiv bleiben. Adapter-Stile überschreiben keine Composer-, Shell- oder Button-Klassen; Regressionstests prüfen diese Grenze und die Stylesheet-Abhängigkeiten.

Nach erfolgreicher Deck-Erstellung oder Import schließt der geschützte Editor vor der Navigation zur aktualisierten Übersicht. Gespeicherte Änderungen lösen keinen Verwerfen-Dialog aus. Die Favoritenansicht zeigt ausgewählte Unterkarten unabhängig; die Anbieterreihenfolge stellt ihre ursprüngliche Verschachtelung wieder her.

## Gespeicherte Lernsteuerung

Lesen/Schreiben ist eine gespeicherte Kontoeinstellung im schwebenden Composer-Menü; Standard ist Lesen. Ein Wechsel während der Übung zeigt vor dem Neustart den gemeinsamen Warndialog. Abbrechen behält Position und Antworten; bereits übermittelte Bewertungen bleiben gespeichert. Die Seitenleiste enthält Alle und markiert den aktuellen Stapel. Die gemeinsame Zeichenüberschrift maskiert das Zeichen bis zum ausdrücklichen Aufdecken. Eine zweite Aktivierung bestätigt außerhalb von Explore die Navigation; innerhalb von Explore öffnet sie die Karte direkt. Die Tastaturbedienung folgt demselben Ablauf.

Neue Wortkarten erkennen beim Abschließen der Eingabe und vor dem Speichern automatisch wörterbuchgestützte Klassen und unterstützte Transformationstags. Eigene Tags bleiben erhalten; mehrdeutige Klassen erfordern eine Auswahl. Verspätete Ergebnisse ändern keinen anderen Entwurf. Vorschauen für gewählte Verb-, Adjektiv-/Adverb- und Pluralformen fordern deren eigene Aufnahme an. Die Herkunftsangabe in der Überschrift verlinkt die Basiskarte. Upload-Felder haben einen eigenen Selektor, damit Audioelemente die Initialisierung des Zeicheneditors nicht mehr abbrechen.

Das seitliche Deckmenü scrollt mit dem Dokument. Das Einblenden der Hauptnavigation verändert keinen unabhängigen Scrollbereich und verschiebt die Karten nicht.

## Sichtbarer Lernmodus und themengerechte Bedienelemente

Die dauerhafte Auswahl für Lesen und Schreiben blendet ihren schwebenden Bereich auf der Lernkartenseite ein. Änderungen behalten die gespeicherte Einstellung und die Bestätigung zum Sitzungsneustart bei. Export- und Study-Einstellungssymbole folgen der aktuellen Bedienfarbe sowie dem hellen oder dunklen App-Design und Hover-Zustand, unabhängig vom Betriebssystem.

Antworten können ein `attempt`-Objekt mit `id` und ISO-Zeitstempel `occurredAt` enthalten. Wiederholungen verwenden dasselbe Objekt und dieselbe Bewertung; neue Antworten erhalten eine neue Kennung. Empfangsbestätigung und Lernzeitplan werden gemeinsam gespeichert. Stabile Ereigniskennungen verhindern doppelte Fortschrittseinträge. Der Browserverlauf behält ausstehende Versuche ohne URL-Daten. Karteikarten deklarieren Bibliothek und Fortschritt als Abhängigkeiten. Geteilte Karten und Schemata laden nach der Freigabeprüfung aktuelle Bibliotheksdaten.

## Dauerhafte Übungsbelohnungen

Zeitplan und Versuchsbeleg der Karteikarte werden vor der adapterübergreifenden Belohnungszustellung festgeschrieben. Der getrennte Ablauf `study:decks:recordResult` stellt nach Fehlern dasselbe Ergebnis erneut zu, ohne den Zeitplan nochmals fortzuschreiben. Dadurch entstehen bei der Fortschrittsspeicherung keine verschachtelten Datenbanktransaktionen.

Antwortmöglichkeiten in Lernkarten sind eigenständige Antwortschaltflächen. Kartenüberschriften und aufgedeckte Antworten verwenden interne Aktionen mit Bestätigung beim Verlassen und erhaltener Stapelreihenfolge, ohne Kartenadressen beim Überfahren anzuzeigen. In Explore öffnet ein zweiter Klick auf die aufgedeckte Zeichenüberschrift die Karte direkt über eine Aktion ohne Adresse.

Schreibübungen verwenden nur die maskierte Überschrift des Zeichenfelds. SVG-Pfeile für Zurück/Weiter stehen darüber neben dem Favoriten; Weiter erfordert weiterhin eine Antwort. Flashcards übergibt `suppressRetry: true` an das gemeinsame Zeichenfeld und blendet Wiederholen aus und deaktiviert es; eigenständige Übungen erlauben Wiederholen standardmäßig.

Eingebettete Verbraucher können nach der gemeinsamen Bestätigung `onNavigate(card)` bereitstellen. Flashcards verbucht damit den aktuellen Versuch über den Ablauf zum Verlassen und erhält den Stapelkontext vor dem Öffnen von Explore.
