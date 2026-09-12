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

## Commits

- [f006429b](https://github.com/Cognis-Labs-HQ/Cognis/commit/f006429b)
