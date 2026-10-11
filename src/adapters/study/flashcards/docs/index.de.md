# Lernkartenadapter

## Verwendung

Ein sichtbarer Stapel öffnet sofort die Übung. Gesamt, Erledigt, Fällig und Neu bestimmen die Lernkarten.

## Technische Spezifikation

Stapel verwenden den Ressourcentyp `studyDeck` und die Leseberechtigung `study:flashcards:read`. Die Cognis-Freigabe unterstützt Benutzer, öffentliche Links, Ablauf, Passwörter und Widerruf. Nur Eigentümer bearbeiten oder löschen Stapel. Empfänger lernen mit getrennten Kontolernplänen; nur Ersteller oder Administratoren exportieren. Linkgäste lernen vorübergehend ohne Änderung eines Kontolernplans. Jede Stapeloperation prüft Ablauf und Widerruf.

Die Freigabe teilt ausdrücklich eine Momentaufnahme der ausgewählten Karten und Definitionen, ohne Zugriff auf die Quellbibliothek oder Änderungen ihres Bereichs. Eigentümerbearbeitungen aktualisieren die Momentaufnahme. Für Eigentümer nicht mehr verfügbare Quellkarten werden beim Lernen ausgelassen. Geteilte Momentaufnahmen bleiben bis zur Bearbeitung oder Löschung Stapelinhalt. Löschen widerruft Freigaben und entfernt Lernfortschritte.

Import und Export verwenden UTF-8-Text mit zitierten, tabulatorgetrennten Spalten Front, Back und optional Pronunciation. Exporte enthalten Anki-Kopfzeilen für Trennzeichen, Stapel und Klartext sowie optionalen Cognis-Kontext. Anki kann diese Zusatzspalte ignorieren. Anführungszeichen, Tabulatoren und Zeilenumbrüche bleiben erhalten. Es handelt sich um TSV-Austausch, nicht um `.apkg`-Archive. Privater Lernfortschritt wird nicht exportiert.

## Study-Ansicht und Favoriten

Flashcards öffnet eine Übersicht eigener Decks, mit dem Konto geteilter Decks und vollständiger Startdecks aktivierter Sprachanbieter. Linkfreigaben behalten ihre Zugriffsregeln und bilden kein öffentliches Verzeichnis. Das +-Menü rechts oben bietet Deck erstellen und Deck importieren. Erkunden, Library und Flashcards verwenden gespeicherte Study-Favoriten und gemeinsame Sortierung (Anbieterreihenfolge, A–Z, Z–A, neueste oder älteste zuerst). Der goldene Stern filtert die Ergebnisse nach Favoriten. Library-Einträge, Decks und einzelne Lernkarten haben getrennte Favoriten. Favoriten gewähren keinen zusätzlichen Zugriff. Das Zeichenfeld beendet seine Sitzung bei Routenwechseln und überschreibt keine Composer- oder Shell-Klassen.

## Startdecks von Anbietern

Ein Sprachdeskriptor kann `starterDecks` mit `{ key, name, schemaId, sourceRecordIds }` deklarieren. Der Schlüssel bleibt innerhalb des Pakets stabil, Namen sind lokalisiert und bis zu 500 eindeutige Quelldatensatzschlüssel legen die Lernreihenfolge fest. Cognis löst globale Library-Einträge zu kanonischen Library-IDs auf. Deck-IDs bleiben bei Inhaltsrevisionen stabil. Unvollständige Decks und deaktivierte Anbieter werden ausgelassen. Startdecks sind schreibgeschützt; Lernfortschritt und Favoriten bleiben persönlich. Erst beim Öffnen werden Kartendetails geladen.

Flashcards lädt die gemeinsamen Stylesheets page-builder und page-sections wie Explore und Requests. Jeder Seitenaufruf besitzt einen abbrechbaren Interaktionsbereich, damit alte Ansichts- und Lernhandler nach Navigation nicht aktiv bleiben. Adapter-Stile überschreiben keine Composer-, Shell- oder Button-Klassen; Regressionstests prüfen diese Grenze und die Stylesheet-Abhängigkeiten.

Nach erfolgreicher Deck-Erstellung oder Import schließt der geschützte Editor vor der Navigation zur aktualisierten Übersicht. Gespeicherte Änderungen lösen keinen Verwerfen-Dialog aus. Die Favoritenansicht zeigt ausgewählte Unterkarten unabhängig; die Anbieterreihenfolge stellt ihre ursprüngliche Verschachtelung wieder her.

## Lernkarten üben

Stapel öffnen sich direkt in der Übung. Gesamt enthält alle Karten; Neu enthält Karten ohne Bewertungsdatensatz; Fällig enthält bewertete Karten mit erreichtem Termin; Erledigt enthält bewertete Karten mit späterem Termin. Neue Karten, auch unter Gesamt, zeigen die vollständige Lernkarte. Andere Karten zeigen die Antwort erst nach einer falschen Leseantwort oder einem abgelehnten Schreibstrich. Eine Kategorie startet eine neue Warteschlange.

Lesen bietet die Hauptaussprache und drei unterschiedliche Aussprachen aus denselben bewerteten, sichtbaren Bibliotheksähnlichkeiten wie Erkunden. Lesen ist nur mit drei gültigen Ablenkungen verfügbar. Schreiben bettet das vollständige gemeinsame Schreibfeld in die Übung ein, sperrt das Zeichen und prüft die Strichreihenfolge. Nicht unterstützte Karten lassen sich ohne erfolgreiche Bewertung überspringen. Richtige Versuche und neue Karten erhalten Gut; falsche Versuche erhalten Erneut.

Bibliotheksnamen, Aussprachen und Definitionen verlinken die Quellkarte in Erkunden. Eine Bestätigung schützt die Übung beim Verlassen. Nicht zugängliche Quellen bleiben geschützt und lassen sich nicht über geteilte Momentaufnahmen öffnen. Der Export nutzt das themengerechte Downloadsymbol oben rechts und ist nur für Ersteller oder Administratoren verfügbar. Das Lernkartenmenü bleibt auf Stapelseiten aktiv.

Browseraktionen verwenden deklarierte study:decks-Abläufe mit before, execute und after. Serverseitiges Auflisten und Details verwenden authorize, read und audit; Speichern, Bewerten und Löschen behalten Prüfung, Berechtigung und Transaktionen. Study besitzt gemeinsame Zeichenoberfläche, Musterzusammenstellung, Ähnlichkeiten und Aktionsabläufe. Der optionale Zeichenadapter integriert nur das schwebende Schreibfeld; eingebettetes Schreiben funktioniert ohne ihn. Seiten und Sitzungen werden beim Verlassen abgebrochen.
