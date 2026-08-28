# Suchoptionen

**Feature Branch:** feature-expand-search-indexing-capabilities

## Erweiterter Suchindex

Das globale Such-Popup enthält jetzt ein dynamisches Registrierungswerkzeug, damit Seiten, sichtbare Seiteninhalte, Beiträge, Chats, Nachrichten und komponenteneigene UI-Bereiche durchsuchbare Ergebniskategorien beitragen können.

## Treffersteuerung

Such-Popups enthalten jetzt Steuerungen für Ganzwortsuche, reguläre Ausdrücke und Groß-/Kleinschreibung.

## Klarere Ergebnisse

Suchergebnisse bevorzugen jetzt Inhaltsnamen und Beschreibungen, heben genaue Treffer hervor und zeigen Textausschnitte mit Umgebung, wenn Inhaltstext gefunden wird.

# Klarere Suchergebnisse

## Study besitzt seinen Suchindex

Study registriert seinen eigenen Pages-Suchweg jetzt über die Study-Gateway-Navigation, während registrierte Sprachmodule über Studys Modulliste beitragen, statt dass die allgemeine Suchlogik Study-spezifische Indizierung besitzt.

## Suche findet Study-Seiten und sichtbare Beiträge

Study fügt jetzt die Gateway-Seite sowie jede registrierte englische und japanische Sprach-Unterseite zur Kategorie Pages hinzu, und die Social-Profile-Suche indiziert dynamisch jeden Beitrag, den der angemeldete Benutzer sehen darf.

## Sucharchitektur ist komponentenbezogen

Die Suchindizierung stellt jetzt eine ctx-gestützte Suchfähigkeit mit komponentenspezifischen Wegen bereit, und die Nachrichtensuche wurde in ein komponenteneigenes Indexmodul verschoben, das die standardisierte Ergebnisform für Benutzerinhalte nutzt.

## Das Suchfenster lässt sich leichter schließen

Oben rechts im Suchfenster befindet sich jetzt eine schwebende Abbrechen-Schaltfläche, sodass Benutzer die Suche direkt schließen können, ohne Escape zu nutzen oder außerhalb zu klicken.

## Gemeinsame Indizes erfassen Seiten und Nachrichten

Docs, Changelog, Study, Study-Unterseiten, Seiten aus dem Benutzermenü und Nachrichteninhalte werden jetzt über gemeinsame Oberflächen registriert, damit sie durchsuchbar sind, ohne jede App vorher zu öffnen. Verbleibende Navigation-Kategorien wurden in Pages zusammengeführt, und die Seitensuche nutzt im dunklen Design nun eine blassere grüne Kombination.

## Fokussierte Suchergebnisse sind klarer

Suchergebnisse erhalten jetzt in hellen und dunklen Designs eine stärkere Hintergrundfarbe beim Hover und Tastaturfokus, damit die fokussierte Zeile beim Durchgehen der Ergebnisse leichter erkennbar bleibt.

## Seiten und Beiträge sind leichter zu finden

Navigationseinträge erscheinen jetzt unter Pages, Study-Unterseiten enthalten ihren übergeordneten Pfad wie Study / Japanese / Hiragana, Docs- und Changelog-Seiten sind wieder in der Seitenindexierung enthalten, sichtbare Beitragskarten werden direkt indexiert, und die Treffer der Seitensuche nutzen in hellen und dunklen Designs stärkere grüne Kontraste.

## Suchergebnisse respektieren sichtbaren Zugriff

Suchanbieter werden jetzt vor der Anzeige gefiltert, damit verborgene oder nicht erreichbare Ergebnisziele keine Titel, Ausschnitte, Zeitstempel oder andere Detailtexte preisgeben. Beiträge, Nachrichten und Benachrichtigungen liefern außerdem sichtbaren Kontext mit Zeitangaben, während Study-Unterseiten doppelte Navigationsergebnisse vermeiden.

## Seitensuche ersetzt sichtbare Inhaltsergebnisse

Die bisherige Ergebnis-Kategorie „Visible Content“ ist jetzt der Suchfilter „On this page“. Wenn er aktiviert ist, bleibt die Seite unverdeckt, gruppierte Ergebnisse werden ausgeblendet, alle Texttreffer auf der Seite werden hervorgehoben und ein Zähler für aktuellen/gesamte Treffer mit Navigation per Eingabetaste und Pfeiltasten wird angezeigt.

## Suchziele werden hervorgehoben

Beim Öffnen eines Ergebnisses wird nun zum referenzierten Element gescrollt und es kurz hervorgehoben. Strg+F öffnet außerdem das globale Suchfenster statt der Browser-Suche.

## Die Einstellungssuche bleibt handlungsorientiert

Die Einstellungssuche überspringt jetzt passiven Absatztext und behält nur Überschriften, Unterseiten, Felder und Vorgänge als eigene Ergebnisse bei, damit Einstellungsseiten übersichtlich bleiben.

## Kalenderereignisse werden global indexiert

Kalenderereignisse werden nun über den Kalender-Navigationsbeitrag registriert, sodass Ereignisse in der globalen Suche erscheinen können, ohne dass die Kalenderseite bereits geöffnet sein muss.

## Ergebnisse enthalten Klassen

Seiten und Komponenten kennzeichnen Suchergebnisse nun als Seiten, Überschriften, Text, Einstellungen, Aktionen, Präferenzen und Ereignisse, damit Darstellung und Filterung erkennen können, welche Art von Inhalt getroffen wurde.

## Beschreibungen erscheinen als Ergebnisse

Beschreibungen in den Einstellungen und gespeicherte Einstellungsdetails werden als eigene Ergebnisse indexiert, statt als Ausschnitte unter übergeordneten Einstellungen angehängt zu werden.

## Kategorie-Filter grenzen Ergebnisse ein

Die Kategorieliste funktioniert nun als Mehrfachauswahl-Filter, damit breite Suchanfragen auf die benötigten Ergebnis-Kategorien eingegrenzt werden können.

## Suchkategorien sind leichter erfassbar

Die globale Suche zeigt passende Ergebnis-Kategorien nun unter den Suchoptionen an, wenn mehrere Kategorien zurückgegeben werden. Dadurch bleiben breite Suchanfragen übersichtlicher, bevor einzelne Treffer geprüft werden.

## Einstellungen-Aktionen sind auffindbar

Kontoaktionen wie Archivieren, Deaktivieren und Löschen werden nun als Aktionen indexiert, damit sie über das globale Suchfenster gefunden werden können.

## Konventionen für die Suchfunktion dokumentiert

Gemeinsamer Suchcode liegt jetzt ausschließlich unter `src/ui/reuse/search-util/`. Komponenteneigene Integrationen sollen eine dedizierte Datei `ui/search/index.js` nutzen, `createSearchIndex` für Inhalts-Provider exportieren und den gemeinsamen Helper `registerSearchIndex` aufrufen. Die Suchfunktion übernimmt Abgleich, Ranking, Hervorhebung, Filterung, Darstellung und das Verwerfen veralteter asynchroner Ergebnisse, während Komponenten teure Abrufe asynchron im Provider halten.

## Commits

- [e3b679b](https://github.com/Cognis-Labs-HQ/Cognis/commit/e3b679bd480e8caef6e8301f410718570299fb26)
