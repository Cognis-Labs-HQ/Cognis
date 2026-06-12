# Kursraum-Überarbeitung

## Kachel-Animation 4× langsamer

Die aktive Kachel-Überschriften-Animation läuft nun mit 6,4 s statt 1,6 s und wirkt damit ruhiger und lesbarer.

## Slideshow-Navigationsschaltflächen ohne Hover-Animation

Die Pfeile für vorherige/nächste Folie unterdrücken jetzt Hover-Übergänge und die Shimmer-Animation.

## Lehrer-Ansichtssynchronisierung umfasst Whiteboard und Notizblock

Das Wechseln zur Whiteboard- oder Notizblock-Registerkarte überträgt die Fokusänderung jetzt in Echtzeit an Schüler. Ein Fehler, bei dem Schüler keine Aktualisierung sahen, wurde behoben.

## Kachel-Layout (Slideshow / Gestapelt) wird an Schüler synchronisiert

Die Wahl des Lehrers zwischen Slideshow und gestapeltem Kachel-Layout wird gespeichert und beim nächsten Echtzeit-Abruf an Schüler übertragen.

## Schüler gesperrt während Lehrer anwesend

Wenn der Lehrer in der ausgewählten Klasse online ist, können Schüler keine Kacheln wechseln, Folien navigieren oder Arbeitsbereich-Tabs verwenden. Die Steuerelemente werden sichtbar gedimmt und automatisch freigegeben, wenn der Lehrer offline geht.

## Agenda-Änderungen werden in Echtzeit an Schüler übertragen

Das Tippen im Agenda-Editor sendet das aktualisierte Dokument automatisch per PUT an den Server, sodass Schüler die neueste Agenda ohne manuelles Speichern sehen.

## Agenda-Symbolleiste und Neu-Schaltfläche

Eine Markdown-Formatierungsleiste (Fett, Kursiv, Durchgestrichen, Code, Zitat, Link, Überschrift) erscheint jetzt über dem Agenda-Eingabefeld. Eine Neu-Schaltfläche erstellt ein leeres Agenda-Dokument.

## Agenda-Snapshot-Dropdown auf Inhaltsbreite begrenzt

Das gespeicherte-Agenda-Auswahlfeld passt sich nun der Inhaltsbreite an, anstatt die Zeile auszufüllen.

## "Kursmaterialien"-Überschrift konsistent mit "Schüler"-Überschrift

Die Bezeichnung „Kursmaterialien" wird nun als einfache Abschnittsüberschrift im Stil der „Schüler"-Überschrift gerendert.

## Größenänderung des Agenda-Textfelds deaktiviert

Das Agenda-Textfeld kann nicht mehr manuell in der Größe verändert werden.

## Kreide-Schrift wiederhergestellt und leicht vergrößert

Die Tafelfläche wendet nun explizit die Kreide-Schrift mit einem etwas größeren Basisschriftgrad an.

## Seitenleisten-Trennlinien entfernt

Sichtbare Trennlinien zwischen Seitenleisten-Abschnitten wurden für ein saubereres Erscheinungsbild entfernt.

## Besprechungsbenachrichtigung unterdrückt, wenn bereits im Kursraum

Schüler, die bereits einen Kursraum anzeigen, erhalten keine Besprechungs-Benachrichtigung für denselben Kursraum.

## Tagesordnungs-Aktualisierungen erreichen Schüler jetzt in Echtzeit

Wenn ein Lehrer Änderungen an der Tagesordnung speichert, wird die Schüleransicht
beim nächsten Aktualisierungszyklus sofort neu gerendert, anstatt auf eine manuelle
Seitennavigation zu warten.

## Schüler können Arbeitsbereich-Tabs frei wechseln

Ein Fehler führte dazu, dass die Board-Fokus-Einstellung des Lehrers bei jedem
3-Sekunden-Tick den gewählten Arbeitsbereich-Tab des Schülers überschrieb, selbst
wenn der Lehrer keine explizite Fokus-Präferenz gesetzt hatte. Die Korrektur prüft
nun, ob tatsächlich ein nicht-leerer Wert vorliegt, bevor die Tab-Auswahl des
Schülers überschrieben wird.

## Schüler werden beim Laden der Seite nicht mehr automatisch in Meetings eingebunden

Die automatische Einbindung wird nun nur noch ausgelöst, wenn ein neues Meeting
in einem Aktualisierungszyklus erkannt wird – nicht mehr für ein Meeting, das
bereits lief, als der Schüler die Seite geladen hat.

## Lehrende können wieder zur Klassenansicht navigieren

Ein Klick auf den Classroom-Tab setzt den Arbeitsbereich-Modus nun korrekt zurück
und rendert das Panel für die Lehrkraft neu.

## Schüler werden automatisch zum aktiven Whiteboard geführt

Wenn eine Lehrkraft ein Whiteboard aktiviert, erhalten Schüler das Einbettungs-Token
beim ersten Datenladen und werden automatisch zum Whiteboard-Tile navigiert.

## Agenda-Autospeichern stört den Fokus des Textfelds nicht mehr

Der Autospeicher-Timer aktualisiert nun den internen Dokumentzustand direkt,
anstatt alle Klassenmetadaten neu zu laden und das gesamte DOM neu zu rendern.

## Verbesserte Agenda-Toolbar mit Textstil-Steuerung

Die Agenda-Toolbar enthält nun ein Textstil-Dropdown (Normal, Überschrift 1–3,
Zitat, Codeblock) wie in gängigen Markdown-Editoren.

## Materialien-Upload mit einheitlichem Plattform-Button

Der Upload-Auslöser im Lehrer-Materialien-Popup verwendet nun ein korrektes
Button-Element statt eines Labels.

## Upload-Flow sendet Bestätigungs- und Fehler-Toasts

Das Hochladen einer Datei erzeugt nun einen Erfolgs- oder Fehler-Toast, und die
Datei erscheint sofort in der Bibliotheksliste mit Titel, Typ, Größe und Datum.

## Materialienliste zeigt Datei-Metadaten

Jeder Bibliothekseintrag zeigt jetzt einen gekürzten Dateinamen, die Erweiterung
in Großbuchstaben, eine lesbare Dateigröße und das Erstellungsdatum.

## "Nichts gefunden"-Status bei leeren Klassenmaterialien

Die Materialien-Seitenleiste zeigt nun eine schattige "Nichts gefunden"-Meldung,
wenn keine verlinkten Klassenmaterialien vorhanden sind.

## Layout-Wechsel bewahrt das aktive Meeting

Das Umschalten des Kachel-Layouts setzt das Meeting-Iframe nicht mehr zurück.

## Arbeitsbereich-Modus des Lehrers wird nach Seitenaktualisierung wiederhergestellt

Der letzte Arbeitsbereich-Modus der Lehrkraft wird aus dem gespeicherten
Board-Fokus-Snapshot gelesen und beim Laden der Seite wiederhergestellt.

## Kachel/Diashow-Einstellung wird pro Nutzer gespeichert

Das zuletzt verwendete Layout jedes Nutzers wird im localStorage gespeichert
und bei jedem Seitenaufruf wiederhergestellt.

## Schüler behalten ihre eigene Kachel/Diashow-Einstellung

Das von der Lehrkraft übertragene Layout überschreibt nicht mehr die persönliche
Layout-Einstellung der Schüler.

## "Agenden bearbeiten"-Popup zum Umbenennen und Löschen gespeicherter Agenden

Eine neue Schaltfläche "Agenden bearbeiten" öffnet ein Popup mit allen gespeicherten
Agenda-Snapshots, die inline umbenannt oder gelöscht werden können.

## API-Routen für Snapshot-Umbenennung und -Löschung hinzugefügt

`PATCH /agenda/snapshots/:snapshotId` und `DELETE /agenda/snapshots/:snapshotId`
stehen nun für Lehrkräfte zur Verfügung.
