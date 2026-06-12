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
