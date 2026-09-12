# Bibliothek und Sicherheit

**Feature-Zweig:** work

## Fokussierte Bibliotheksmodule

Der Einstiegspunkt des Study-Library-Browsers ist jetzt ein kleiner Seitenkoordinator. Kartenrendering, Ebenenraster, Detail-Popups, Auswahl, Browserinteraktionen und Varianteninteraktionen liegen in fokussierten Modulen mit ungefähr 100–200 Zeilen, wobei das bestehende UI-Verhalten erhalten bleibt.

## Atomare Fortschrittskorrekturen

Gewöhnliche Fortschrittsereignisse können keine Kompensationskennungen mehr einschleusen. Korrekturen verwenden die dafür vorgesehene Operation, und der persistente Ereignisspeicher garantiert atomar höchstens eine Korrektur pro Ziel.

## Autorisiertes Löschen

Beim Löschen aus der Bibliothek werden nun die endgültige Kaskade ermittelt und alle betroffenen Einträge innerhalb der Löschtransaktion autorisiert. Damit ist die Lücke zwischen Autorisierung und gleichzeitigen Beziehungsänderungen geschlossen.

## Stärkere Modulgrenzen

Die Prüfung externer Module lehnt alle symbolischen Verknüpfungen einschließlich Verzeichnisnamen mit Punkten ab und erkennt geschützte UI-Klassen auch in Klassenattributselektoren.

## Zweitschreibweisen im Titel

Alternative Schreibweisen von Wörtern und Sätzen erscheinen nun als navigierbarer sekundärer Titelinhalt direkt unter der primären Schreibweise. Zeichenartige strukturelle Varianten werden im Detailinhalt nicht mehr wiederholt.

## Eindeutige Aussprachetitel

Primäre und sekundäre Schreibweisen werden nicht mehr als Aussprachemetadaten wiederholt. Aussprachen bleiben einfacher Titeltext und werden nie heuristisch in Links zu Schreibeinträgen umgewandelt, sodass angezeigte Beziehungen ausschließlich den vom Modul bereitgestellten Bibliotheksgraphen widerspiegeln.

## Commits

- [f006429b](https://github.com/Cognis-Labs-HQ/Cognis/commit/f006429b)
- [458c6bea](https://github.com/Cognis-Labs-HQ/Cognis/commit/458c6bea)
- [a009f770](https://github.com/Cognis-Labs-HQ/Cognis/commit/a009f770)
