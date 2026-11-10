# Geführte Anleitungen

Diese Anleitungen erklären die verfügbaren Aktionen dieser Komponente.

## Anleitung verwenden

Öffnen Sie eine der folgenden Seiten für eine noch nicht abgeschlossene Anleitung. Über das ? neben dem Seitentitel wiederholen Sie eine abgeschlossene Anleitung; Überspringen beendet die Wiederholung.

## Technische Spezifikation

| Seite / Bereich                                | Anleitung            | Zugriff             |
| ---------------------------------------------- | -------------------- | ------------------- |
| `^/study/explore(?:/\|$)`                      | Bibliothek erkunden  | Angemeldeter Nutzer |
| `^/study/library/search(?:/\|$)`               | Wörterbuchsuche      | Angemeldeter Nutzer |
| `^/study/(?:library/)?requests(?:/\|$)`        | Bibliotheksanfragen  | Angemeldeter Nutzer |
| `^/study/library(?:/\|$)` · `.library-browser` | Bibliothek verwalten | Administrator       |

Anleitungen registrieren sich über die öffentliche Capability `ui:tutorials` mit komponenteneigenen Definitionen, Katalogen, Zielen und Lebenszyklus-Signalen. Seiten, sichtbare Bereiche und Zugriffsrechte bestimmen die Verfügbarkeit. Das Entfernen der Komponente gibt ihre Anleitungen frei. Darstellung und Abschluss beschreibt der [Tutorial-Vertrag des Hosts](/docs/tutorials).

`scope` begrenzt Ziele und Erkennung. Das optionale `visibleWhen` verlangt ein eindeutig sichtbares Element, ohne Ziele auf dessen Nachfahren zu beschränken; sie bleiben innerhalb der Komponente. Die Bibliotheksverwaltung prüft damit ihren Browser und erklärt die Suche in der Seitenleiste. Ungültige Selektoren brechen die Registrierung ab und räumen den Anbieter auf.

Explore beginnt mit Ebenenseitenleiste, Filtern und einem stabilen Favoritenbeispiel. Ein Klick auf die gewählte Karte öffnet den bedingten Detailzweig; Weiter überspringt ihn. Details und optionale Schreibaktionen werden im eigenen Dialog getrennt hervorgehoben; der Dialog schließt am Zweigende.

Favoriten- und Detailschritte teilen einen stabilen Kartencontainer, auch auf Alphabetseiten und nach Umsortierung.

## Sprachvarianten Und Zweige

Der Anbieter veröffentlicht `study:libraryTutorials` Version 1 über gekapselte Aktionen. Module rufen `register({ owner, id, language, titleKey, text, stringsBaseUrls, signal })` mit stabiler Identität, Sprache und lokalisierten Schritttexten auf. Ergebnis: `{ id, dispose }`. Library besitzt Selektoren, Kartenaktionen, Routenwahl und Dialoglebensdauer; Module importieren keine Implementierung. Doppelte Sprachregistrierung scheitert; Entfernung stellt den allgemeinen Explore-Leitfaden wieder her.

Nur ausdrücklich gewählte Lernsprachen erhalten Modulführungen. Auf `/study` sind sie manuell wählbar; im passenden Explore ersetzt die Sprachvariante die allgemeine Anleitung. Registrierung und Erkennung navigieren nie. Bewusster Start aus der Übersicht öffnet Inhalte, bestehende Ebenen bleiben erhalten. Der Erstellungszweig kann von Zeichen zu einer Ebene mit Kartenerstellung wechseln.

Die Anleitung erklärt Ebenen, Filter, dieselbe Favoritenkarte, Kartendetails, verfügbare Aussprache, Schreibübung und Zeichenwerkzeuge. Klicks auf Karte oder Zeichnen öffnen Zweige; Weiter überspringt ungeöffnete Zweige. Zurück von der Zeichenfläche führt zum Kartenöffner, weil Zeichnen den Dialog schließt.

Erstellen öffnet die echte Kartentypauswahl und danach Editor, Register und Speicheraktionen. Nichts wird automatisch gespeichert. Dialoge und Zeichenfeld folgen dem Zweig; Zurück, Neustart, Abschluss und Entfernung schließen sie mit Schutz ungespeicherter Änderungen.
