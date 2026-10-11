# Lernkartenadapter

## Verwendung

Der Study-Lernkartenadapter erstellt benannte Stapel aus allen lesbaren Bibliotheksebenen und importiert Anki-kompatible TSV-Notizen. Routen, Speicherung, Darstellung, Lernplan, Oberfläche und Texte gehören dem Adapter. Nach dem Umdrehen werden Aussprache und Definitionen sichtbar. Erneut wiederholt nach einer Minute; Gut beginnt mit einem Tag und verdoppelt; Einfach beginnt mit vier Tagen und verdreifacht.

## Technische Spezifikation

Stapel verwenden den Ressourcentyp `studyDeck` und die Leseberechtigung `study:flashcards:read`. Die Cognis-Freigabe unterstützt Benutzer, öffentliche Links, Ablauf, Passwörter und Widerruf. Nur Eigentümer bearbeiten oder löschen Stapel. Empfänger lernen und exportieren mit getrennten Kontolernplänen. Linkgäste lernen vorübergehend ohne Änderung eines Kontolernplans. Jede Stapeloperation prüft Ablauf und Widerruf.

Die Freigabe teilt ausdrücklich eine Momentaufnahme der ausgewählten Karten und Definitionen, ohne Zugriff auf die Quellbibliothek oder Änderungen ihres Bereichs. Eigentümerbearbeitungen aktualisieren die Momentaufnahme. Für Eigentümer nicht mehr verfügbare Quellkarten werden beim Lernen ausgelassen. Geteilte Momentaufnahmen bleiben bis zur Bearbeitung oder Löschung Stapelinhalt. Löschen widerruft Freigaben und entfernt Lernfortschritte.

Import und Export verwenden UTF-8-Text mit zitierten, tabulatorgetrennten Spalten Front, Back und optional Pronunciation. Exporte enthalten Anki-Kopfzeilen für Trennzeichen, Stapel und Klartext sowie optionalen Cognis-Kontext. Anki kann diese Zusatzspalte ignorieren. Anführungszeichen, Tabulatoren und Zeilenumbrüche bleiben erhalten. Es handelt sich um TSV-Austausch, nicht um `.apkg`-Archive. Privater Lernfortschritt wird nicht exportiert.
