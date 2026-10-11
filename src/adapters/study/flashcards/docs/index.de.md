# Lernkartenadapter

## Verwendung

Der Study-Lernkartenadapter erstellt benannte Stapel aus allen lesbaren Bibliotheksebenen und importiert Anki-kompatible TSV-Notizen. Routen, Speicherung, Darstellung, Lernplan, Oberfläche und Texte gehören dem Adapter. Nach dem Umdrehen werden Aussprache und Definitionen sichtbar. Erneut wiederholt nach einer Minute; Gut beginnt mit einem Tag und verdoppelt; Einfach beginnt mit vier Tagen und verdreifacht.

## Technische Spezifikation

Stapel verwenden den Ressourcentyp `studyDeck` und die Leseberechtigung `study:flashcards:read`. Die Cognis-Freigabe unterstützt Benutzer, öffentliche Links, Ablauf, Passwörter und Widerruf. Nur Eigentümer bearbeiten oder löschen Stapel. Empfänger lernen und exportieren mit getrennten Kontolernplänen. Linkgäste lernen vorübergehend ohne Änderung eines Kontolernplans. Jede Stapeloperation prüft Ablauf und Widerruf.

Die Freigabe teilt ausdrücklich eine Momentaufnahme der ausgewählten Karten und Definitionen, ohne Zugriff auf die Quellbibliothek oder Änderungen ihres Bereichs. Eigentümerbearbeitungen aktualisieren die Momentaufnahme. Für Eigentümer nicht mehr verfügbare Quellkarten werden beim Lernen ausgelassen. Geteilte Momentaufnahmen bleiben bis zur Bearbeitung oder Löschung Stapelinhalt. Löschen widerruft Freigaben und entfernt Lernfortschritte.

Import und Export verwenden UTF-8-Text mit zitierten, tabulatorgetrennten Spalten Front, Back und optional Pronunciation. Exporte enthalten Anki-Kopfzeilen für Trennzeichen, Stapel und Klartext sowie optionalen Cognis-Kontext. Anki kann diese Zusatzspalte ignorieren. Anführungszeichen, Tabulatoren und Zeilenumbrüche bleiben erhalten. Es handelt sich um TSV-Austausch, nicht um `.apkg`-Archive. Privater Lernfortschritt wird nicht exportiert.

## Study-Ansicht und Favoriten

Flashcards öffnet eine Übersicht eigener Decks, mit dem Konto geteilter Decks und vollständiger Startdecks aktivierter Sprachanbieter. Linkfreigaben behalten ihre Zugriffsregeln und bilden kein öffentliches Verzeichnis. Das +-Menü rechts oben bietet Deck erstellen und Deck importieren. Erkunden, Library und Flashcards verwenden gespeicherte Study-Favoriten und gemeinsame Sortierung (Anbieterreihenfolge, A–Z, Z–A, neueste oder älteste zuerst). Der goldene Stern filtert die Ergebnisse nach Favoriten. Library-Einträge, Decks und einzelne Lernkarten haben getrennte Favoriten. Favoriten gewähren keinen zusätzlichen Zugriff. Das Zeichenfeld beendet seine Sitzung bei Routenwechseln und überschreibt keine Composer- oder Shell-Klassen.

## Startdecks von Anbietern

Ein Sprachdeskriptor kann `starterDecks` mit `{ key, name, schemaId, sourceRecordIds }` deklarieren. Der Schlüssel bleibt innerhalb des Pakets stabil, Namen sind lokalisiert und bis zu 500 eindeutige Quelldatensatzschlüssel legen die Lernreihenfolge fest. Cognis löst globale Library-Einträge zu kanonischen Library-IDs auf. Deck-IDs bleiben bei Inhaltsrevisionen stabil. Unvollständige Decks und deaktivierte Anbieter werden ausgelassen. Startdecks sind schreibgeschützt; Lernfortschritt und Favoriten bleiben persönlich. Erst beim Öffnen werden Kartendetails geladen.

Flashcards lädt die gemeinsamen Stylesheets page-builder und page-sections wie Explore und Requests. Jeder Seitenaufruf besitzt einen abbrechbaren Interaktionsbereich, damit alte Ansichts- und Lernhandler nach Navigation nicht aktiv bleiben. Adapter-Stile überschreiben keine Composer-, Shell- oder Button-Klassen; Regressionstests prüfen diese Grenze und die Stylesheet-Abhängigkeiten.

Nach erfolgreicher Deck-Erstellung oder Import schließt der geschützte Editor vor der Navigation zur aktualisierten Übersicht. Gespeicherte Änderungen lösen keinen Verwerfen-Dialog aus. Die Favoritenansicht zeigt ausgewählte Unterkarten unabhängig; die Anbieterreihenfolge stellt ihre ursprüngliche Verschachtelung wieder her.
