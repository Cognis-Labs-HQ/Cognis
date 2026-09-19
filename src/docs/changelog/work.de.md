# Bibliothek und Sicherheit

**Feature-Zweig:** work

## Fokussierte Bibliotheksmodule

Der Einstiegspunkt des Study-Library-Browsers ist jetzt ein kleiner Seitenkoordinator. Kartenrendering, Ebenenraster, Detail-Popups, Auswahl, Browserinteraktionen und Varianteninteraktionen liegen in fokussierten Modulen mit ungefähr 100–200 Zeilen, wobei das bestehende UI-Verhalten erhalten bleibt.

## Atomare Fortschrittskorrekturen

Gewöhnliche Fortschrittsereignisse können keine Kompensationskennungen mehr einschleusen. Korrekturen verwenden die dafür vorgesehene Operation, und der persistente Ereignisspeicher garantiert atomar höchstens eine Korrektur pro Ziel.

## Autorisiertes Löschen

Beim Löschen aus der Bibliothek werden nun die endgültige Kaskade ermittelt und alle betroffenen Einträge innerhalb der Löschtransaktion autorisiert. Damit ist die Lücke zwischen Autorisierung und gleichzeitigen Beziehungsänderungen geschlossen.

## Stärkere Modulgrenzen

Die Prüfung externer Module lehnt symbolische Verknüpfungen für Quellcode, Verzeichnisse (einschließlich Namen mit Punkten) und Assets außerhalb der Modulgrenze ab. Sichere modulinterne Asset-Verknüpfungen bleiben nutzbar. Geschützte UI-Klassen in Klassenattributselektoren werden ebenfalls erkannt.

## Zweitschreibweisen im Titel

Alternative Schreibweisen von Wörtern und Sätzen erscheinen nun als navigierbarer sekundärer Titelinhalt direkt unter der primären Schreibweise. Zeichenartige strukturelle Varianten werden im Detailinhalt nicht mehr wiederholt.

## Eindeutige Aussprachetitel

Primäre und sekundäre Schreibweisen werden nicht mehr als Aussprachemetadaten wiederholt. Aussprachen bleiben einfacher Titeltext und werden nie heuristisch in Links zu Schreibeinträgen umgewandelt, sodass angezeigte Beziehungen ausschließlich den vom Modul bereitgestellten Bibliotheksgraphen widerspiegeln.

## Korrekte Bibliotheksbeziehungen und Inhaltspakete

Löschvorschauen berücksichtigen jetzt Kaskaden-, Trennungs- und Einschränkungsrichtlinien, ohne abhängige Einträge als ausdrücklich ausgewählte Löschungen zu behandeln. Verborgene oder platzierte Einträge bleiben aus der Popup-Reihenfolge ausgeschlossen. Aktualisierungen von Inhaltspaketen bewahren ausgelassene Anbietereinträge standardmäßig; Herausgeber können eine maßgebliche Bereinigung ausdrücklich anfordern.

## Dauerhaftes und deterministisches Fortschrittsverhalten

Fortschrittswiederholungen vergleichen Ereignisse strukturell, gleiche Zeitstempel verwenden Ereignis-IDs als deterministische Entscheidung, unsichere Extremdaten werden vor der Speicherung abgelehnt, fehlerhaftes JSON liefert einen Clientfehler und deaktivierte Adapter sperren ihre Fähigkeiten und Ablauf-Hooks.

## Vollständige Prüfung von Modul-Stylesheets

Die Prüfung externer Module erkennt nun direkte URLs zu Cognis-Interna sowohl in CSS-Importen und Asset-URLs als auch in Skripten.

## Sichere Grenzen für Wiederholungsdaten

Fortschrittsprojektionen begrenzen Wiederholungsintervalle jetzt auf vierzehn Tage. Dies entspricht der Prüfung von Ereigniszeitstempeln und stellt sicher, dass jedes angenommene Ereignis rekonstruierbar bleibt.

## Commits

- [f006429b](https://github.com/Cognis-Labs-HQ/Cognis/commit/f006429b)
- [458c6bea](https://github.com/Cognis-Labs-HQ/Cognis/commit/458c6bea)
- [a009f770](https://github.com/Cognis-Labs-HQ/Cognis/commit/a009f770)
- [799fc33d](https://github.com/Cognis-Labs-HQ/Cognis/commit/799fc33d)
- [d472ffa9](https://github.com/Cognis-Labs-HQ/Cognis/commit/d472ffa9)
- [992973f5](https://github.com/Cognis-Labs-HQ/Cognis/commit/992973f5a421fa0043bfa792a1b4757abcff8209)
- [4c7366ad](https://github.com/Cognis-Labs-HQ/Cognis/commit/4c7366adec02748038211fcdf407f8b5b2ea759e)
