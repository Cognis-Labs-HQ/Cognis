# Technische Referenz

Öffentliche Schnittstellen und Betriebsregeln von Lernkarten.

## Schnittstellen

study:decks bietet den Stapeldienst. /api/v1/study/decks unterstützt GET-Liste, GET/:id, POST-Speichern und DELETE/:id; POST/:id/review erhält cardId, grade und attempt.

## Konfiguration

Inhalt und Sichtbarkeit gehören zum Stapel. Lesen/Schreiben ist eine Kontoeinstellung; Starterstapel stammen von Anbietern statt fester Sprachlisten.

## Verhalten

### Begrenzte Deckdokumente

Deckzugehörigkeit, importierte Notizen und Lernpläne verwenden Unicode-sichere Fragmente mit höchstens 60.000 UTF-8-Bytes. Eine verknüpfte Abfrage setzt jedes bestätigte Dokument zusammen; Ersetzen und Löschen erfolgen in der Decktransaktion. Upserts der Lernendenzeile serialisieren Wiederholungen und Deckänderungen vor Snapshot-Lesezugriffen, auch bei Repeatable Read. Versuchsbelege werden mit dem Lernplan bestätigt; die Progress-Zustellung bleibt außerhalb dieser Transaktion. Antworten und Exporte lösen Karten und Schemas anhand aktueller Library-IDs auf; Speichern dupliziert keine Library-Karteninhalte.

Bewertungsanfragen akzeptieren höchstens 16 KiB JSON, Deckänderungen höchstens 5 MiB. Größere Anfragen liefern HTTP 413 ohne Änderung an Deck oder Lernplan. Lesen, Schreiben, Wiederholungslisten, importierte Notizen und Bibliothekskarten behalten ihr Verhalten.

Übungen verwenden eine Frage und eine einzige Antwortansicht; Vorder- und Rückseite werden nicht mehr umgedreht. Falsche Antworten, bereits beantwortete Karten und Antwort zeigen behalten die vollständige bibliotheksbasierte Ansicht sowie die Bewertung Erneut bei. Reine Satzstapel verwenden Lesen und blenden den schwebenden Modusschalter aus, ohne die gespeicherte Einstellung für beschreibbare Stapel zu ändern. Gemischte Stapel behalten den gewählten Modus. Sätze und lange Antworten können innerhalb der Seitenbreite bis zu 72rem nutzen. Ungültige Sprachkennungen liefern invalid_language mit HTTP 400.

Leseaufgaben zeigen die primäre Aussprache neben dem Kartenwert, wenn beide voneinander abweichen; gleichwertiger normalisierter Text wird nicht wiederholt. Ein rundes Fragezeichen hebt die richtige aktuelle Antwort hervor und fokussiert sie, auch bei gemischter Reihenfolge. Die Nutzung des Hinweises speichert Erneut über den bestehenden Bewertungsablauf; eine anschließend richtige Auswahl bleibt unterstützt. Richtige Antworten ohne Hilfe werden weiterhin als Gut bewertet. Schreibübungen behalten ihre eigenen Hilfefunktionen.

Erneut versuchen wird nur angezeigt, wenn die aktualisierte Warteschlange für den gewählten Fokus Karten enthält. Bei leerem Fokus bleiben die Glückwünsche und die Startseite-Aktion erhalten, ohne einen leeren Neustart anzubieten.

Nach Abschluss eines Stapels erscheinen ein zentrierter grüner Haken und Glückwünsche. Startseite führt zu Alle. Erneut versuchen erstellt die ausgewählte Warteschlange anhand des aktuellen Bewertungsstatus neu und beginnt bei der ersten Karte und behält den Fokus Gesamt/Erledigt/Fällig/Neu bei, auch wenn gespeicherte Bewertungen den Kartenstatus verändert haben. Nur Sitzungsantworten und Versuchskennungen werden zurückgesetzt; gespeicherter Lernfortschritt bleibt erhalten. Über Freigabelinks werden dieselbe Abschlussansicht und ein Neustart der temporären Sitzung verwendet.

### Verwendung

Ein sichtbarer Stapel öffnet sofort die Übung. Gesamt, Erledigt, Fällig und Neu bestimmen die Lernkarten.

### Study-Ansicht und Favoriten

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/study-language-framework/technical).

### Startdecks von Anbietern

Ein Sprachdeskriptor kann `starterDecks` mit `{ key, name, schemaId, sourceRecordIds }` deklarieren. Der Schlüssel bleibt innerhalb des Pakets stabil, Namen sind lokalisiert und bis zu 500 eindeutige Quelldatensatzschlüssel legen die Lernreihenfolge fest. Cognis löst globale Library-Einträge zu kanonischen Library-IDs auf. Deck-IDs bleiben bei Inhaltsrevisionen stabil. Unvollständige Decks und deaktivierte Anbieter werden ausgelassen. Startdecks sind schreibgeschützt; Lernfortschritt und Favoriten bleiben persönlich. Erst beim Öffnen werden Kartendetails geladen.

Flashcards lädt die gemeinsamen Stylesheets page-builder und page-sections wie Explore und Requests. Jeder Seitenaufruf besitzt einen abbrechbaren Interaktionsbereich, damit alte Ansichts- und Lernhandler nach Navigation nicht aktiv bleiben. Adapter-Stile überschreiben keine Composer-, Shell- oder Button-Klassen; Regressionstests prüfen diese Grenze und die Stylesheet-Abhängigkeiten.

Nach erfolgreicher Deck-Erstellung oder Import schließt der geschützte Editor vor der Navigation zur aktualisierten Übersicht. Gespeicherte Änderungen lösen keinen Verwerfen-Dialog aus. Die Favoritenansicht zeigt ausgewählte Unterkarten unabhängig; die Anbieterreihenfolge stellt ihre ursprüngliche Verschachtelung wieder her.

### Gespeicherte Lernsteuerung

Lesen/Schreiben ist eine gespeicherte Kontoeinstellung im schwebenden Composer-Menü; Standard ist Lesen. Ein Wechsel während der Übung zeigt vor dem Neustart den gemeinsamen Warndialog. Abbrechen behält Position und Antworten; bereits übermittelte Bewertungen bleiben gespeichert. Die Seitenleiste enthält Alle und markiert den aktuellen Stapel. Die gemeinsame Zeichenüberschrift maskiert das Zeichen bis zum ausdrücklichen Aufdecken. Eine zweite Aktivierung bestätigt außerhalb von Explore die Navigation; innerhalb von Explore öffnet sie die Karte direkt. Die Tastaturbedienung folgt demselben Ablauf.

Neue Wortkarten erkennen beim Abschließen der Eingabe und vor dem Speichern automatisch wörterbuchgestützte Klassen und unterstützte Transformationstags. Eigene Tags bleiben erhalten; mehrdeutige Klassen erfordern eine Auswahl. Verspätete Ergebnisse ändern keinen anderen Entwurf. Vorschauen für gewählte Verb-, Adjektiv-/Adverb- und Pluralformen fordern deren eigene Aufnahme an. Die Herkunftsangabe in der Überschrift verlinkt die Basiskarte. Upload-Felder haben einen eigenen Selektor, damit Audioelemente die Initialisierung des Zeicheneditors nicht mehr abbrechen.

Das seitliche Deckmenü scrollt mit dem Dokument. Das Einblenden der Hauptnavigation verändert keinen unabhängigen Scrollbereich und verschiebt die Karten nicht.

### Sichtbarer Lernmodus und themengerechte Bedienelemente

Die dauerhafte Auswahl für Lesen und Schreiben blendet ihren schwebenden Bereich auf der Lernkartenseite ein. Änderungen behalten die gespeicherte Einstellung und die Bestätigung zum Sitzungsneustart bei. Export- und Study-Einstellungssymbole folgen der aktuellen Bedienfarbe sowie dem hellen oder dunklen App-Design und Hover-Zustand, unabhängig vom Betriebssystem.

Antworten können ein `attempt`-Objekt mit `id` und ISO-Zeitstempel `occurredAt` enthalten. Wiederholungen verwenden dasselbe Objekt und dieselbe Bewertung; neue Antworten erhalten eine neue Kennung. Empfangsbestätigung und Lernzeitplan werden gemeinsam gespeichert. Stabile Ereigniskennungen verhindern doppelte Fortschrittseinträge. Der Browserverlauf behält ausstehende Versuche ohne URL-Daten. Karteikarten deklarieren Bibliothek und Fortschritt als Abhängigkeiten. Geteilte Karten und Schemata laden nach der Freigabeprüfung aktuelle Bibliotheksdaten.

### Dauerhafte Übungsbelohnungen

Zeitplan und Versuchsbeleg der Karteikarte werden vor der adapterübergreifenden Belohnungszustellung festgeschrieben. Der getrennte Ablauf `study:decks:recordResult` stellt nach Fehlern dasselbe Ergebnis erneut zu, ohne den Zeitplan nochmals fortzuschreiben. Dadurch entstehen bei der Fortschrittsspeicherung keine verschachtelten Datenbanktransaktionen.

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/gateways/study/technical).

Der Browser-Haupteinstieg ist `ui/app/index.js`; Aktionen, Darstellung, Sprache und Übungsmodule liegen daneben. Geteilte Stapel verwenden `ui/app/shared-deck.js`. Serverseitiges Stapelverhalten verwendet `service/index.ts` mit Routen-, Ablauf-, Speicher- und Ergebnismodulen im selben Dienstverzeichnis.

### Gleichmäßige Übungsauswahl

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/gateways/study/technical).

Beim Lesen wird derselbe Inhaltsvergleich für Ablenkungsantworten, Hinweise und Bewertung verwendet. Satzschlusszeichen, Großschreibung, kompatible Unicode-Formen und mehrfache Leerzeichen unterscheiden Antworten nicht. Innere Satzzeichen, Zahlen, Akzente und andere Wörter bleiben bedeutungstragend. Gleichwertige Bedeutungen werden nicht als konkurrierende Optionen angeboten; bei Verfügbarkeit nutzt ein Quiz zwei bis vier verschiedene Antworten. Richtige gleichwertige Eingaben erhalten vor der Fortschrittsübermittlung die übliche Erfolgsbewertung.

Die Stapelseitenleiste scrollt innerhalb der sichtbaren Seitenhöhe unabhängig. Lange Stapellisten verlängern die Seite nicht und schieben die Übung nicht nach unten.

Beim Öffnen eines anderen Stapels wird dessen Inhalt sofort sichtbar; die Rückkehr von Explore erhält die gespeicherte Übungsposition.

### Leere Offline-Lernseiten

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/api/technical).

### Dauerhaft vorgemerkte Änderungen

Vorgemerkte Kartenbewertungen behalten ihr erfolgreiches Ergebnis, auch wenn optionale Aktivitätserfassung fehlschlägt. Sie verzögert den Bewertungsbeleg nicht. Die bestehenden Konto-, Einwilligungs- und Puffergrenzen gelten weiter.

### Offline-Arbeitsbereich

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/api/technical).

### Offline-Übungen

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/api/technical).

### Zuverlässige Freigaben und Tests

Die Freigabe-Hooks von Calendar und Flashcards berücksichtigen leere Ergebnisse anderer Ressourcenanbieter. Link- und Kontofreigaben lassen sich dadurch bei aktivierten Anbietern erstellen und auflösen. Ladeansicht, Kontofreigabestatus und Kalender-Gastansicht verwenden responsive Mindestgrößen statt acht verpflichtender Rasterspalten und bleiben auf schmalen Bildschirmen nutzbar. Die Freigabewartung läuft nacheinander, bündelt überlappende Aufrufe, beendet fehlgeschlagene Durchläufe und versucht es nach fünfzehn Minuten erneut. Deaktivierung stoppt weitere Arbeit; Reaktivierung setzt die Planung fort.

Die Flashcard-Übung für Gäste verwendet eine vorübergehende Modusauswahl und deaktiviert Kontofunktionen sowie gespeicherte Layouteinstellungen. Sie liest oder schreibt keine Übungseinstellungen eines Kontos.

### Prüfung und Lebenszyklus

Gastseiten prüfen den Abbruch nach Lokalisierung, Composer-Initialisierung, Sitzungs- und Anbieterladen sowie Stil- und Renderer-Importen. Composer, Kalender-Popups und Ressourcenanfragen verwenden das Seitensignal. Abgebrochene Seiten überschreiben keine Folgeseite und melden keine veralteten Ergebnisse. Wartungsdurchläufe übergeben ihren Aufgaben ebenfalls ein Abbruchsignal; die Deaktivierung von Share verhindert spätere Ablaufbenachrichtigungen innerhalb einer laufenden Prüfung.

### Geltungsbereich der Anmeldung

Kontoaktionen erfordern bestätigte Kontositzungen. Aktionen für freigegebene Ressourcen prüfen Gastanmeldungen ausdrücklich und kontrollieren die aktuelle Freigabe vor den Ressourcenberechtigungen. Kontonamen bestimmen niemals den Anmeldetyp. Widerrufener oder abgelaufener Zugriff wird abgelehnt.

## Sicherheit

Stapelaktionen prüfen Eigentum und Freigabe. Export braucht Ersteller- oder Administratorrechte; Freigaben begründen weder Klassenmitgliedschaft noch Belohnungen aus beliebigen Importereignissen.

## Referenz

### Technische Spezifikation

Stapel verwenden den Ressourcentyp `studyDeck` und die Leseberechtigung `study:flashcards:read`. Die Cognis-Freigabe unterstützt Benutzer, öffentliche Links, Ablauf, Passwörter und Widerruf. Nur Eigentümer bearbeiten oder löschen Stapel. Empfänger lernen mit getrennten Kontolernplänen; nur Ersteller oder Administratoren exportieren. Linkgäste lernen vorübergehend ohne Änderung eines Kontolernplans. Jede Stapeloperation prüft Ablauf und Widerruf.

Eine Freigabe gewährt stapelbezogenen Zugriff auf aktuelle Bibliothekskarten und Definitionen, ohne allgemeinen Bibliothekszugriff oder Bereichsänderung. Nach der Freigabeprüfung werden die IDs mit den Berechtigungen des Eigentümers aufgelöst. Nicht verfügbare Karten und Inhalte deaktivierter Anbieter werden ausgelassen. Galeriedaten und Bewertungsantworten enthalten keine gespeicherten Kartenkopien. Beim Löschen werden Freigaben widerrufen sowie Lernzeitpläne und Empfangsbestätigungen entfernt.

Import und Export verwenden UTF-8-Text mit zitierten, tabulatorgetrennten Spalten Front, Back und optional Pronunciation. Exporte enthalten Anki-Kopfzeilen für Trennzeichen, Stapel und Klartext sowie optionalen Cognis-Kontext. Anki kann diese Zusatzspalte ignorieren. Anführungszeichen, Tabulatoren und Zeilenumbrüche bleiben erhalten. Es handelt sich um TSV-Austausch, nicht um `.apkg`-Archive. Privater Lernfortschritt wird nicht exportiert.

### Technische Spezifikation

| Seite / Bereich                           | Anleitung             | Zugriff               |
| ----------------------------------------- | --------------------- | --------------------- |
| `^/study/(?:[a-z-]+/)?flashcards(?:/\|$)` | Karteikartenanleitung | Angemeldeter Nutzer   |
| Flashcards · `[data-study-deck]`          | Stapel verwalten      | Angemeldeter Benutzer |
| Flashcards · `[data-practice]`            | Mit einem Stapel üben | Angemeldeter Benutzer |

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/adapters/social/messages/technical).

Die Verwaltungsanleitung verwendet den ausgewählten Stapel als Grenze und umfasst Bearbeiten, Teilen und Exportieren. In der Stapelliste bleibt sie nicht verfügbar.

Die Übungsanleitung behandelt Aufgabe und Rückmeldung. Lesen oder Schreiben wählen Sie nach Abschluss über das normale schwebende Menü; während der Anleitung steht dessen Auswahl nicht bereit.
